import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// numeric -> number, bigint -> number, timestamptz -> ISO string
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1184, (v) => new Date(v).toISOString());

const g = globalThis as unknown as { __dukePool?: Pool };

export function pool(): Pool {
  if (!g.__dukePool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada (.env.local)");
    g.__dukePool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
    });
    g.__dukePool.on("error", (e) => console.error("[pg] erro no pool:", e.message));
  }
  return g.__dukePool;
}

export type Q = Pick<PoolClient, "query">;

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

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const r = await fn(c);
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
