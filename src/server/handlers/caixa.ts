import "server-only";
import { FORMAS } from "@/lib/labels";
import { round2 } from "@/lib/utils";
import { ServiceError } from "@/services/_base";
import type { NovoPagamento, ResumoCaixa } from "@/services/caixa.service";
import type { Caixa, Comanda, FormaPagamento, Pagamento } from "@/types";
import { query, tx, um, type Q } from "../db";
import { COMANDA_SQL, detalhar, exigir, type Ctx } from "../comum";

const CAIXA_SQL = `select id, aberto_por as "abertoPor", aberto_em as "abertoEm", fundo_inicial as "fundoInicial",
  fechado_em as "fechadoEm", fechado_por as "fechadoPor", valores_contados as "valoresContados" from caixas`;
const PAGAMENTO_RET = `id, comanda_id as "comandaId", caixa_id as "caixaId", forma, valor,
  valor_recebido as "valorRecebido", troco, usuario_id as "usuarioId", criado_em as "criadoEm", estornado,
  motivo_estorno as "motivoEstorno", estornado_por as "estornadoPor", estornado_em as "estornadoEm"`;

export async function getCaixaAberto(ctx: Ctx): Promise<Caixa | null> {
  exigir(ctx, "caixa");
  return (await um<Caixa>(`${CAIXA_SQL} where fechado_em is null limit 1`)) ?? null;
}

export async function abrirCaixa(ctx: Ctx, fundoInicial: number, _usuarioId?: string): Promise<Caixa> {
  const sessao = exigir(ctx, "caixa");
  const fundo = Number(fundoInicial);
  if (!Number.isFinite(fundo) || fundo < 0) throw new ServiceError("Fundo inicial inválido");
  try {
    return (await um<Caixa>(
      `insert into caixas (aberto_por, fundo_inicial) values ($1, $2)
       returning id, aberto_por as "abertoPor", aberto_em as "abertoEm", fundo_inicial as "fundoInicial"`,
      [sessao.uid, round2(fundo)],
    ))!;
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") throw new ServiceError("Já existe um caixa aberto", "CONFLITO");
    throw e;
  }
}

/** registra a baixa; fecha a comanda automaticamente quando total pago >= total */
export async function registrarPagamento(
  ctx: Ctx,
  dados: NovoPagamento,
): Promise<{ pagamento: Pagamento; comandaFechada: boolean }> {
  const sessao = exigir(ctx, "caixa");
  if (!FORMAS.includes(dados?.forma)) throw new ServiceError("Forma de pagamento inválida");
  return tx(async (c) => {
    const caixa = await um<{ id: string }>(`select id from caixas where fechado_em is null limit 1`, [], c);
    if (!caixa) throw new ServiceError("Abra o caixa antes de registrar pagamentos", "PROIBIDO");
    // trava a comanda: dois caixas pagando ao mesmo tempo não podem passar do total
    const cm = await um<Comanda>(`${COMANDA_SQL} where c.id = $1 for update of c`, [String(dados.comandaId)], c);
    if (!cm) throw new ServiceError("Comanda não encontrada", "NAO_ENCONTRADO");
    if (cm.status === "fechada" || cm.status === "cancelada") throw new ServiceError("Comanda já está fechada", "PROIBIDO");

    const { totais } = (await detalhar(c, [cm]))[0];
    const valor = round2(Number(dados.valor));
    if (!(valor > 0)) throw new ServiceError("Informe um valor maior que zero");
    if (valor > totais.restante + 0.001) throw new ServiceError("Valor maior que o restante da comanda");

    let recebido: number | null = null;
    let troco: number | null = null;
    if (dados.forma === "dinheiro") {
      recebido = round2(Number(dados.valorRecebido ?? valor));
      if (recebido < valor) throw new ServiceError("Valor recebido menor que o valor do pagamento");
      troco = round2(recebido - valor);
    }
    const pagamento = (await um<Pagamento>(
      `insert into pagamentos (comanda_id, caixa_id, forma, valor, valor_recebido, troco, usuario_id)
       values ($1,$2,$3,$4,$5,$6,$7) returning ${PAGAMENTO_RET}`,
      [cm.id, caixa.id, dados.forma, valor, recebido, troco, sessao.uid],
      c,
    ))!;

    const fechou = round2(totais.pago + valor) >= totais.total;
    if (fechou) {
      await c.query(
        `update comandas set status = 'fechada', fechada_em = now(), fechada_por = $2, chamando_garcom = false where id = $1`,
        [cm.id, sessao.uid],
      );
    }
    return { pagamento, comandaFechada: fechou };
  });
}

/** estorno: comanda fechada volta para "aguardando pagamento" */
export async function estornarPagamento(ctx: Ctx, pagamentoId: string, motivo: string, _usuarioId?: string): Promise<void> {
  const sessao = exigir(ctx, "caixa");
  const m = String(motivo ?? "").trim();
  if (m.length < 5) throw new ServiceError("Descreva o motivo do estorno (mín. 5 caracteres)");
  await tx(async (c) => {
    const pg = await um<{ estornado: boolean; comandaId: string; fechadoEm: string | null }>(
      `select p.estornado, p.comanda_id as "comandaId", cx.fechado_em as "fechadoEm"
       from pagamentos p join caixas cx on cx.id = p.caixa_id where p.id = $1 for update of p`,
      [pagamentoId],
      c,
    );
    if (!pg) throw new ServiceError("Pagamento não encontrado", "NAO_ENCONTRADO");
    if (pg.estornado) throw new ServiceError("Pagamento já estornado", "CONFLITO");
    if (pg.fechadoEm) throw new ServiceError("O caixa deste pagamento já foi fechado", "PROIBIDO");
    await c.query(
      `update pagamentos set estornado = true, motivo_estorno = $2, estornado_por = $3, estornado_em = now() where id = $1`,
      [pagamentoId, m, sessao.uid],
    );
    await c.query(
      `update comandas set status = 'aguardando_pagamento', fechada_em = null, fechada_por = null
       where id = $1 and status = 'fechada'`,
      [pg.comandaId],
    );
  });
}

async function resumo(c: Q, caixaId: string): Promise<ResumoCaixa> {
  const caixa = await um<Caixa>(`${CAIXA_SQL} where id = $1`, [caixaId], c);
  if (!caixa) throw new ServiceError("Caixa não encontrado", "NAO_ENCONTRADO");
  const pgs = await query<{ forma: FormaPagamento; valor: number; troco: number | null }>(
    `select forma, valor, troco from pagamentos where caixa_id = $1 and not estornado`,
    [caixaId],
    c,
  );
  const esperado = Object.fromEntries(FORMAS.map((f) => [f, 0])) as Record<FormaPagamento, number>;
  const quantidade = Object.fromEntries(FORMAS.map((f) => [f, 0])) as Record<FormaPagamento, number>;
  for (const p of pgs) {
    esperado[p.forma] = round2(esperado[p.forma] + p.valor);
    quantidade[p.forma] += 1;
  }
  const abertas = await um<{ n: number }>(
    `select count(*)::int as n from comandas where status in ('aberta','aguardando_pagamento')`,
    [],
    c,
  );
  return {
    caixa,
    esperado,
    quantidade,
    trocoDado: round2(pgs.reduce((s, p) => s + (p.troco ?? 0), 0)),
    totalVendas: round2(pgs.reduce((s, p) => s + p.valor, 0)),
    dinheiroGaveta: round2(caixa.fundoInicial + esperado.dinheiro),
    comandasEmAberto: abertas?.n ?? 0,
  };
}

export async function resumoCaixa(ctx: Ctx, caixaId: string): Promise<ResumoCaixa> {
  exigir(ctx, "caixa");
  return tx((c) => resumo(c, String(caixaId)));
}

export async function fecharCaixa(
  ctx: Ctx,
  caixaId: string,
  contados: Partial<Record<FormaPagamento, number>>,
  _usuarioId?: string,
): Promise<Caixa> {
  const sessao = exigir(ctx, "caixa");
  const limpos: Partial<Record<FormaPagamento, number>> = {};
  for (const f of FORMAS) {
    const v = Number(contados?.[f]);
    if (contados?.[f] !== undefined && Number.isFinite(v) && v >= 0) limpos[f] = round2(v);
  }
  const r = await um<Caixa>(
    `update caixas set fechado_em = now(), fechado_por = $2, valores_contados = $3
     where id = $1 and fechado_em is null
     returning id, aberto_por as "abertoPor", aberto_em as "abertoEm", fundo_inicial as "fundoInicial",
               fechado_em as "fechadoEm", fechado_por as "fechadoPor", valores_contados as "valoresContados"`,
    [caixaId, sessao.uid, JSON.stringify(limpos)],
  );
  if (!r) {
    const existe = await um(`select id from caixas where id = $1`, [caixaId]);
    throw existe ? new ServiceError("Caixa já fechado", "CONFLITO") : new ServiceError("Caixa não encontrado", "NAO_ENCONTRADO");
  }
  return r;
}
