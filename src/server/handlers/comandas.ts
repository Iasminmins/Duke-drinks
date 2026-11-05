import "server-only";
import { normalizarCelular } from "@/lib/celular";
import { ServiceError } from "@/services/_base";
import type { FiltroHistorico } from "@/services/comandas.service";
import type { Comanda, ComandaDetalhada, StatusComanda } from "@/types";
import { pool, query, tx, um } from "../db";
import { bloqueado, limpar, registrarFalha } from "../limite";
import { COMANDA_SQL, codigoConfere, comandaPorId, detalhar, exigir, type Ctx } from "../comum";

const TZ = "America/Sao_Paulo";

/**
 * Acesso a uma comanda: equipe logada OU o cliente com o código dela (limitado contra tentativa e erro).
 * Devolve a comanda ou lança erro.
 */
async function autorizar(ctx: Ctx, id: string, codigo?: string): Promise<Comanda> {
  const cm = await comandaPorId(pool(), String(id));
  if (ctx.sessao && ctx.sessao.papel !== "cozinha" && ctx.sessao.papel !== "bar") {
    if (!cm) throw new ServiceError("Comanda não encontrada", "NAO_ENCONTRADO");
    return cm;
  }
  const chave = `cmd:${ctx.ip}:${id}`;
  if (bloqueado(chave, 10, 5 * 60_000)) {
    throw new ServiceError("Muitas tentativas. Tente de novo em alguns minutos.", "PROIBIDO");
  }
  if (!cm || !codigoConfere(cm, codigo)) {
    registrarFalha(chave);
    throw new ServiceError("Código incorreto. Confira com o garçom.", "PROIBIDO");
  }
  limpar(chave);
  return cm;
}

export async function getComanda(ctx: Ctx, id: string, codigo?: string): Promise<ComandaDetalhada> {
  const cm = await autorizar(ctx, id, codigo);
  return (await detalhar(pool(), [cm]))[0];
}

export async function listarComandas(ctx: Ctx, status: StatusComanda[]): Promise<ComandaDetalhada[]> {
  exigir(ctx, "caixa");
  const lista = (Array.isArray(status) ? status : []).filter((s) =>
    ["aberta", "aguardando_pagamento", "fechada", "cancelada"].includes(s),
  );
  // comandas já encerradas: só as das últimas 24h (o movimento do expediente)
  const cms = await query<Comanda>(
    `${COMANDA_SQL}
     where c.status = any($1)
       and (c.status in ('aberta','aguardando_pagamento') or c.fechada_em >= now() - interval '24 hours')`,
    [lista],
  );
  const det = await detalhar(pool(), cms);
  return det.sort((a, b) => {
    if (a.status !== b.status) return a.status === "aguardando_pagamento" ? -1 : 1;
    return a.mesaNumero - b.mesaNumero || a.abertaEm.localeCompare(b.abertaEm);
  });
}

export async function historicoComandas(ctx: Ctx, f: FiltroHistorico): Promise<ComandaDetalhada[]> {
  exigir(ctx, "caixa");
  const data = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const cms = await query<Comanda>(
    `${COMANDA_SQL}
     where c.status in ('fechada','cancelada')
       and ($1::date is null or (coalesce(c.fechada_em, c.aberta_em) at time zone '${TZ}')::date >= $1::date)
       and ($2::date is null or (coalesce(c.fechada_em, c.aberta_em) at time zone '${TZ}')::date <= $2::date)
       and ($3::text is null or exists (select 1 from pagamentos p where p.comanda_id = c.id and p.forma = $3 and not p.estornado))
       and ($4::text is null or c.fechada_por = $4)
     order by c.fechada_em desc nulls last
     limit 500`,
    [data(f?.de), data(f?.ate), f?.forma || null, f?.operadorId || null],
  );
  const det = await detalhar(pool(), cms);
  return det.sort((a, b) => (b.fechadaEm ?? "").localeCompare(a.fechadaEm ?? ""));
}

/** valida o código que o garçom passou ao cliente */
export async function validarCodigo(ctx: Ctx, comandaId: string, codigo: string): Promise<boolean> {
  const cm = await autorizar({ ...ctx, sessao: null }, comandaId, codigo);
  if (cm.status !== "aberta") throw new ServiceError("Comanda não está aberta", "PROIBIDO");
  return true;
}

export async function chamarGarcom(ctx: Ctx, comandaId: string, codigo?: string): Promise<void> {
  const cm = await autorizar(ctx, comandaId, codigo);
  if (cm.status !== "aberta") throw new ServiceError("Comanda não está aberta", "PROIBIDO");
  await query(`update comandas set chamando_garcom = true, chamado_em = now() where id = $1`, [cm.id]);
}

export async function atenderChamado(ctx: Ctx, comandaId: string): Promise<void> {
  exigir(ctx, "garcom");
  await query(`update comandas set chamando_garcom = false, chamado_em = null where id = $1`, [comandaId]);
}

export async function pedirConta(ctx: Ctx, comandaId: string, codigo?: string): Promise<void> {
  const cm = await autorizar(ctx, comandaId, codigo);
  if (cm.status !== "aberta") throw new ServiceError("A conta já foi solicitada", "CONFLITO");
  await query(
    `update comandas set status = 'aguardando_pagamento', chamando_garcom = false where id = $1 and status = 'aberta'`,
    [cm.id],
  );
}

/** devolve a comanda para "aberta" (cliente quer pedir mais depois de pedir a conta) */
export async function reabrirComanda(ctx: Ctx, comandaId: string): Promise<void> {
  exigir(ctx, "garcom");
  const r = await um(
    `update comandas set status = 'aberta' where id = $1 and status = 'aguardando_pagamento' returning id`,
    [comandaId],
  );
  if (!r) throw new ServiceError("Não é possível reabrir", "CONFLITO");
}

export async function ajustarComanda(
  ctx: Ctx,
  comandaId: string,
  ajustes: { cobrarTaxaServico?: boolean; desconto?: number },
): Promise<void> {
  exigir(ctx, "caixa");
  const cm = await comandaPorId(pool(), String(comandaId));
  if (!cm) throw new ServiceError("Comanda não encontrada", "NAO_ENCONTRADO");
  if (cm.status === "fechada" || cm.status === "cancelada") {
    throw new ServiceError("Comanda fechada não pode ser alterada", "PROIBIDO");
  }
  if (ajustes?.desconto !== undefined && !(Number(ajustes.desconto) >= 0)) throw new ServiceError("Desconto inválido");
  await query(
    `update comandas set
       cobrar_taxa_servico = coalesce($2::boolean, cobrar_taxa_servico),
       desconto = coalesce($3::numeric, desconto)
     where id = $1`,
    [
      comandaId,
      ajustes?.cobrarTaxaServico === undefined ? null : !!ajustes.cobrarTaxaServico,
      ajustes?.desconto === undefined ? null : Number(ajustes.desconto),
    ],
  );
}

export async function cancelarComanda(ctx: Ctx, comandaId: string, _usuarioId?: string): Promise<void> {
  const sessao = exigir(ctx, "garcom", "caixa");
  await tx(async (c) => {
    const cm = await um<{ id: string }>(`select id from comandas where id = $1 for update`, [comandaId], c);
    if (!cm) throw new ServiceError("Comanda não encontrada", "NAO_ENCONTRADO");
    const pg = await um<{ n: number }>(
      `select count(*)::int as n from pagamentos where comanda_id = $1 and not estornado`,
      [comandaId],
      c,
    );
    if (pg && pg.n > 0) throw new ServiceError("Estorne os pagamentos antes de cancelar", "CONFLITO");
    await c.query(
      `update comandas set status = 'cancelada', fechada_em = now(), fechada_por = $2, chamando_garcom = false where id = $1`,
      [comandaId, sessao.uid],
    );
  });
}

function validarDados(nome: unknown, celular: unknown) {
  const n = String(nome ?? "").trim();
  if (n.length < 2) throw new ServiceError("Informe seu nome");
  const cel = normalizarCelular(String(celular ?? ""));
  if (!cel) throw new ServiceError("Celular inválido. Use DDD + número, ex.: (24) 99999-8888");
  return { nome: n, celular: cel };
}

/** garçom/caixa corrige ou completa nome e celular da comanda */
export async function atualizarCliente(ctx: Ctx, comandaId: string, nome: string, celular: string): Promise<void> {
  exigir(ctx, "garcom", "caixa");
  const v = validarDados(nome, celular);
  const r = await um(
    `update comandas set cliente_nome = $2, cliente_celular = $3 where id = $1 returning id`,
    [comandaId, v.nome, v.celular],
  );
  if (!r) throw new ServiceError("Comanda não encontrada", "NAO_ENCONTRADO");
}

/** cliente informa nome e celular no QR (exige o código da comanda) */
export async function identificarCliente(
  ctx: Ctx,
  comandaId: string,
  codigo: string,
  nome: string,
  celular: string,
): Promise<void> {
  const cm = await autorizar({ ...ctx, sessao: null }, comandaId, codigo);
  if (cm.status !== "aberta") throw new ServiceError("Comanda não está aberta", "PROIBIDO");
  const v = validarDados(nome, celular);
  await query(`update comandas set cliente_nome = $2, cliente_celular = $3 where id = $1`, [cm.id, v.nome, v.celular]);
}
