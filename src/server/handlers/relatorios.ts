import "server-only";
import { FORMAS } from "@/lib/labels";
import { round2 } from "@/lib/utils";
import type { Comanda, FormaPagamento, ResumoDashboard } from "@/types";
import { pool, query, um } from "../db";
import { COMANDA_SQL, detalhar, exigir, type Ctx } from "../comum";

const TZ = "America/Sao_Paulo";

/** hora local do bar (não a do servidor) */
function horaLocal(iso: string) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: TZ }).format(new Date(iso)),
  ) % 24;
}

/** indicadores das últimas 24h (cobre o expediente que vira a meia-noite) */
export async function getResumoDashboard(ctx: Ctx): Promise<ResumoDashboard> {
  exigir(ctx, "admin");
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const pagamentos = await query<{ forma: FormaPagamento; valor: number; criadoEm: string }>(
    `select forma, valor, criado_em as "criadoEm" from pagamentos where not estornado and criado_em >= $1`,
    [desde],
  );
  const fechadas = await query<Comanda>(`${COMANDA_SQL} where c.status = 'fechada' and c.fechada_em >= $1`, [desde]);
  const det = await detalhar(pool(), fechadas);
  const totais = det.map((d) => d.totais.total);

  const vendidos = await query<{ nome: string; quantidade: number; total: number }>(
    `select i.nome, sum(i.quantidade)::int as quantidade, sum(i.preco_unitario * i.quantidade) as total
     from itens_pedido i join pedidos p on p.id = i.pedido_id
     where p.criado_em >= $1 and i.status <> 'cancelado'
     group by i.produto_id, i.nome order by quantidade desc limit 6`,
    [desde],
  );
  const abertas = await um<{ n: number }>(
    `select count(*)::int as n from comandas where status in ('aberta','aguardando_pagamento')`,
  );

  const horas = new Map<number, number>();
  for (let h = 17; h <= 24; h++) horas.set(h % 24, 0);
  for (const p of pagamentos) {
    const h = horaLocal(p.criadoEm);
    horas.set(h, round2((horas.get(h) ?? 0) + p.valor));
  }
  const porHora = [...horas.entries()]
    .sort(([a], [b]) => ((a + 7) % 24) - ((b + 7) % 24)) // 17h..01h em ordem de expediente
    .map(([h, total]) => ({ hora: `${String(h).padStart(2, "0")}h`, total }));

  return {
    faturamentoDia: round2(pagamentos.reduce((s, p) => s + p.valor, 0)),
    ticketMedio: totais.length ? round2(totais.reduce((a, b) => a + b, 0) / totais.length) : 0,
    comandasFechadas: fechadas.length,
    comandasAbertas: abertas?.n ?? 0,
    maisVendidos: vendidos.map((v) => ({ nome: v.nome, quantidade: v.quantidade, total: round2(v.total) })),
    porHora,
    porForma: FORMAS.map((forma) => ({
      forma,
      total: round2(pagamentos.filter((p) => p.forma === forma).reduce((s, p) => s + p.valor, 0)),
    })).filter((x) => x.total > 0),
  };
}
