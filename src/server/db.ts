import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// numeric -> number, bigint -> number, timestamptz -> ISO string
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1184, (v) => new Date(v).toISOString());

const g = globalThis as unknown as { __appPool?: Pool };

/**
 * Pool cru, com o usuário dono do banco (ignora RLS).
 * Só a camada de plataforma (resolver tenant, cadastro, painel da plataforma) usa isto.
 * Regras de negócio NUNCA: elas usam query/um/tx, que rodam dentro do escopo do tenant.
 */
export function poolPlataforma(): Pool {
  if (!g.__appPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada (.env.local)");
    g.__appPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
    });
    g.__appPool.on("error", (e) => console.error("[pg] erro no pool:", e.message));
  }
  return g.__appPool;
}

export type Q = Pick<PoolClient, "query">;

interface Escopo {
  client: PoolClient;
  savepoints: number;
}
const escopo = new AsyncLocalStorage<Escopo>();

/**
 * Roda `fn` numa transação presa a um estabelecimento:
 *   - app.eid = id do estabelecimento (as policies de RLS filtram por ele)
 *   - role app_rls (sem bypassrls), então nenhuma consulta enxerga outro negócio
 * Funciona com o pooler do Neon (modo transação), porque tudo é `local` à transação.
 * eid null = nenhum negócio: as tabelas aparecem vazias.
 */
export async function comTenant<T>(eid: string | null, fn: () => Promise<T>): Promise<T> {
  if (escopo.getStore()) throw new Error("comTenant aninhado");
  const c = await poolPlataforma().connect();
  try {
    await c.query("begin");
    await c.query("select set_config('app.eid', $1, true)", [eid ?? ""]);
    await c.query("set local role app_rls");
    const r = await escopo.run({ client: c, savepoints: 0 }, fn);
    await c.query("commit");
    return r;
  } catch (e) {
    try {
      await c.query("rollback");
    } catch {}
    throw e;
  } finally {
    c.release();
  }
}

/** conexão do tenant atual. Fora de comTenant é erro (nunca cai no pool sem RLS). */
export function pool(): Q {
  const s = escopo.getStore();
  if (!s) throw new Error("Consulta fora do escopo de um estabelecimento (use comTenant)");
  return s.client;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  c: Q = pool(),
): Promise<T[]> {
  const r = await c.query<T>(sql, params as never[]);
  return r.rows;
}

export async function um<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = [], c: Q = pool()) {
  return (await query<T>(sql, params, c))[0];
}

/**
 * Bloco atômico dentro da requisição. Como a requisição inteira já é uma transação,
 * isto vira um SAVEPOINT: se `fn` falhar, desfaz só o bloco (e o erro sobe normalmente).
 * Use também em volta de um comando cujo erro você vai capturar e tratar (ex.: 23505).
 */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const s = escopo.getStore();
  if (!s) throw new Error("tx fora do escopo de um estabelecimento (use comTenant)");
  const nome = `sp_${++s.savepoints}`;
  await s.client.query(`savepoint ${nome}`);
  try {
    const r = await fn(s.client);
    await s.client.query(`release savepoint ${nome}`);
    return r;
  } catch (e) {
    try {
      await s.client.query(`rollback to savepoint ${nome}`);
    } catch {}
    throw e;
  }
}
