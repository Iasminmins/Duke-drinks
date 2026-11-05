import "server-only";
import { normalizarCelular } from "@/lib/celular";
import { round2 } from "@/lib/utils";
import { ServiceError } from "@/services/_base";
import type { ComandaPublica } from "@/services/mesas.service";
import type { Comanda, Mesa, MesaComStatus, StatusMesa } from "@/types";
import { pool, query, um } from "../db";
import { bloqueado, limpar, registrarFalha } from "../limite";
import { COMANDA_SQL, detalhar, erroAmigavel, exigir, type Ctx } from "../comum";

const MESA_SQL = `select id, numero, lugares, ativa from mesas`;
const ATIVAS = `('aberta','aguardando_pagamento')`;

function statusDaMesa(cs: Comanda[]): StatusMesa {
  if (cs.length === 0) return "livre";
  if (cs.some((c) => c.chamandoGarcom && c.status === "aberta")) return "chamando";
  if (cs.every((c) => c.status === "aguardando_pagamento")) return "aguardando_pagamento";
  return "ocupada";
}

export async function listarMesasComStatus(ctx: Ctx): Promise<MesaComStatus[]> {
  exigir(ctx, "garcom", "caixa");
  const [mesas, comandas] = await Promise.all([
    query<Mesa>(`${MESA_SQL} where ativa order by numero`),
    query<Comanda>(`${COMANDA_SQL} where c.status in ${ATIVAS} order by c.aberta_em`),
  ]);
  const detalhadas = await detalhar(pool(), comandas);
  return mesas.map((m) => {
    const ds = detalhadas.filter((d) => d.mesaId === m.id);
    const cs: Comanda[] = ds.map(({ pedidos: _p, pagamentos: _g, totais: _t, ...base }) => {
      void _p, _g, _t;
      return base;
    });
    return {
      ...m,
      status: statusDaMesa(cs),
      comanda: cs[0],
      comandas: cs,
      totalParcial: ds.length ? round2(ds.reduce((t, d) => t + d.totais.total, 0)) : undefined,
    };
  });
}

export async function listarMesas(ctx: Ctx): Promise<Mesa[]> {
  exigir(ctx, "admin", "garcom", "caixa");
  return query<Mesa>(`${MESA_SQL} order by numero`);
}

/** usado pela tela do cliente: só dados públicos da mesa */
export async function getMesaPublica(_ctx: Ctx, numero: number) {
  const mesa = await um<Mesa>(`${MESA_SQL} where numero = $1 and ativa`, [Number(numero)]);
  if (!mesa) throw new ServiceError("Mesa não encontrada", "NAO_ENCONTRADO");
  const r = await um<{ n: number }>(
    `select count(*)::int as n from comandas where mesa_id = $1 and status = 'aberta'`,
    [mesa.id],
  );
  return { mesa, comandasAbertas: r?.n ?? 0 };
}

/** cliente digita o código de 4 dígitos e entra na SUA comanda (a mesa pode ter várias) */
export async function entrarNaComanda(ctx: Ctx, mesaNumero: number, codigo: string): Promise<ComandaPublica> {
  const chave = `codigo:${ctx.ip}:${Number(mesaNumero)}`;
  if (bloqueado(chave, 10, 5 * 60_000)) {
    throw new ServiceError("Muitas tentativas. Peça ao garçom o código e tente de novo em alguns minutos.", "PROIBIDO");
  }
  const c = await um<{ id: string; clienteNome: string | null; clienteCelular: string | null }>(
    `select c.id, c.cliente_nome as "clienteNome", c.cliente_celular as "clienteCelular"
     from comandas c join mesas m on m.id = c.mesa_id
     where m.numero = $1 and m.ativa and c.status = 'aberta' and c.codigo = $2`,
    [Number(mesaNumero), String(codigo ?? "").trim()],
  );
  if (!c) {
    registrarFalha(chave);
    throw new ServiceError("Código incorreto. Confira com o garçom.", "PROIBIDO");
  }
  limpar(chave);
  return { id: c.id, clienteNome: c.clienteNome ?? undefined, clienteCelular: c.clienteCelular ?? undefined };
}

/** garçom abre a comanda; gera um código de 4 dígitos (único entre as comandas ativas da mesa) */
export async function abrirComanda(
  ctx: Ctx,
  mesaId: string,
  _usuarioId: string,
  cliente: { nome: string; celular: string },
): Promise<Comanda> {
  const sessao = exigir(ctx, "garcom");
  const nome = String(cliente?.nome ?? "").trim();
  if (nome.length < 2) throw new ServiceError("Informe o nome do cliente");
  const celular = normalizarCelular(String(cliente?.celular ?? ""));
  if (!celular) throw new ServiceError("Informe o celular com DDD, ex.: (24) 99999-8888");
  const mesa = await um<Mesa>(`${MESA_SQL} where id = $1 and ativa`, [mesaId]);
  if (!mesa) throw new ServiceError("Mesa não encontrada", "NAO_ENCONTRADO");

  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const codigo = String(Math.floor(1000 + Math.random() * 9000));
    try {
      const r = await um<{ id: string }>(
        `insert into comandas (mesa_id, codigo, aberta_por, cliente_nome, cliente_celular)
         values ($1, $2, $3, $4, $5) returning id`,
        [mesaId, codigo, sessao.uid, nome, celular],
      );
      return (await um<Comanda>(`${COMANDA_SQL} where c.id = $1`, [r!.id]))!;
    } catch (e) {
      if ((e as { code?: string })?.code !== "23505") throw e; // código repetido: sorteia outro
    }
  }
  throw new ServiceError("Não foi possível gerar um código. Tente novamente.", "CONFLITO");
}

export async function salvarMesa(ctx: Ctx, dados: Mesa): Promise<Mesa> {
  exigir(ctx, "admin");
  const numero = Math.trunc(Number(dados?.numero));
  const lugares = Math.trunc(Number(dados?.lugares));
  if (!(numero > 0)) throw new ServiceError("Número da mesa inválido");
  if (!(lugares > 0)) throw new ServiceError("Número de lugares inválido");
  try {
    if (dados.id) {
      const r = await um<Mesa>(
        `update mesas set numero=$2, lugares=$3, ativa=$4 where id=$1 returning id, numero, lugares, ativa`,
        [dados.id, numero, lugares, dados.ativa !== false],
      );
      if (!r) throw new ServiceError("Mesa não encontrada", "NAO_ENCONTRADO");
      return r;
    }
    return (await um<Mesa>(
      `insert into mesas (numero, lugares, ativa) values ($1,$2,$3) returning id, numero, lugares, ativa`,
      [numero, lugares, dados.ativa !== false],
    ))!;
  } catch (e) {
    return erroAmigavel(e, { "23505": `Já existe a mesa ${numero}` });
  }
}

export async function excluirMesa(ctx: Ctx, id: string): Promise<void> {
  exigir(ctx, "admin");
  const r = await um<{ n: number }>(
    `select count(*)::int as n from comandas where mesa_id = $1 and status in ${ATIVAS}`,
    [id],
  );
  if (r && r.n > 0) throw new ServiceError("A mesa tem comanda aberta", "CONFLITO");
  await query(`update mesas set ativa = false where id = $1`, [id]);
}
