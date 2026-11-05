import "server-only";
import { PROXIMO_STATUS } from "@/lib/labels";
import { ServiceError } from "@/services/_base";
import type { NovoPedido } from "@/services/pedidos.service";
import type { Comanda, ItemPedido, Notificacao, Pedido, StatusPedido, TicketKds } from "@/types";
import { pool, query, tx, um } from "../db";
import { bloqueado, limpar, registrarFalha } from "../limite";
import { carregarPedidos, codigoConfere, comandaPorId, exigir, type Ctx } from "../comum";

const ORDEM: StatusPedido[] = ["recebido", "preparando", "pronto", "entregue", "cancelado"];
const menorStatus = (itens: Pick<ItemPedido, "status">[]) =>
  itens.reduce<StatusPedido>((min, i) => (ORDEM.indexOf(i.status) < ORDEM.indexOf(min) ? i.status : min), "entregue");

export async function criarPedido(ctx: Ctx, dados: NovoPedido): Promise<Pedido> {
  const origem = dados?.origem === "garcom" ? "garcom" : "cliente";
  if (origem === "garcom") exigir(ctx, "garcom");

  const cm = await comandaPorId(pool(), String(dados?.comandaId));
  if (origem === "cliente") {
    const chave = `cmd:${ctx.ip}:${dados?.comandaId}`;
    if (bloqueado(chave, 10, 5 * 60_000)) {
      throw new ServiceError("Muitas tentativas. Tente de novo em alguns minutos.", "PROIBIDO");
    }
    if (!cm || !codigoConfere(cm as Comanda, dados?.codigo)) {
      registrarFalha(chave);
      throw new ServiceError("Código da mesa inválido. Peça um novo código ao garçom.", "PROIBIDO");
    }
    limpar(chave);
  }
  if (!cm || cm.status !== "aberta") {
    throw new ServiceError("A comanda desta mesa não está aberta para pedidos", "PROIBIDO");
  }
  const itensEntrada = Array.isArray(dados.itens) ? dados.itens : [];
  if (!itensEntrada.length) throw new ServiceError("O pedido está vazio");
  if (itensEntrada.length > 60) throw new ServiceError("Pedido grande demais. Envie em partes.");

  return tx(async (c) => {
    const ids = [...new Set(itensEntrada.map((i) => String(i.produtoId)))];
    const prods = await query<{ id: string; nome: string; preco: number; setorId: string; esgotado: boolean; ativo: boolean }>(
      `select id, nome, preco, setor_id as "setorId", esgotado, ativo from produtos where id = any($1)`,
      [ids],
      c,
    );
    const permitidos = await query<{ produtoId: string; adicionalId: string; nome: string; preco: number }>(
      `select pa.produto_id as "produtoId", a.id as "adicionalId", a.nome, a.preco
       from produto_adicionais pa join adicionais a on a.id = pa.adicional_id where pa.produto_id = any($1)`,
      [ids],
      c,
    );

    const ped = await um<{ id: string }>(
      `insert into pedidos (comanda_id, origem) values ($1, $2) returning id`,
      [cm.id, origem],
      c,
    );

    for (const it of itensEntrada) {
      const prod = prods.find((p) => p.id === String(it.produtoId) && p.ativo);
      if (!prod) throw new ServiceError("Um dos produtos não está mais disponível", "NAO_ENCONTRADO");
      if (prod.esgotado) throw new ServiceError(`${prod.nome} acabou de esgotar`, "CONFLITO");
      const qtd = Math.trunc(Number(it.quantidade));
      if (!(qtd >= 1 && qtd <= 50)) throw new ServiceError("Quantidade inválida");
      const obs = String(it.observacao ?? "").trim().slice(0, 140) || null;
      const item = await um<{ id: string }>(
        `insert into itens_pedido (pedido_id, produto_id, nome, preco_unitario, quantidade, observacao, setor_id)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [ped!.id, prod.id, prod.nome, prod.preco, qtd, obs, prod.setorId],
        c,
      );
      const pedidos = Array.isArray(it.adicionaisIds) ? it.adicionaisIds.map(String) : [];
      for (const aid of pedidos) {
        const a = permitidos.find((x) => x.produtoId === prod.id && x.adicionalId === aid);
        if (!a) continue; // adicional que o produto não oferece: ignora
        await c.query(`insert into item_adicionais (item_id, adicional_id, nome, preco) values ($1,$2,$3,$4)`, [
          item!.id,
          a.adicionalId,
          a.nome,
          a.preco,
        ]);
      }
    }
    return (await carregarPedidos(c, [cm.id])).find((p) => p.id === ped!.id)!;
  });
}

// ------------------------------------------------------------------ KDS
function exigirSetor(ctx: Ctx, setorSlug: string) {
  const s = exigir(ctx, "cozinha", "bar");
  if (s.papel !== "admin" && s.papel !== setorSlug) {
    throw new ServiceError("Seu acesso não inclui este setor", "PROIBIDO");
  }
  return s;
}

export async function listarTickets(ctx: Ctx, setorSlug: string): Promise<TicketKds[]> {
  exigirSetor(ctx, setorSlug);
  const rows = await query<{
    pedidoId: string;
    numero: number;
    mesaNumero: number;
    clienteNome: string | null;
    criadoEm: string;
  } & Omit<ItemPedido, "adicionais">>(
    `select p.id as "pedidoId", p.numero, m.numero as "mesaNumero", c.cliente_nome as "clienteNome", p.criado_em as "criadoEm",
            i.id, i.produto_id as "produtoId", i.nome, i.preco_unitario as "precoUnitario", i.quantidade,
            i.observacao, i.setor_id as "setorId", i.status
     from itens_pedido i
     join pedidos p on p.id = i.pedido_id
     join comandas c on c.id = p.comanda_id
     join mesas m on m.id = c.mesa_id
     join setores s on s.id = i.setor_id
     where s.slug = $1 and c.status in ('aberta','aguardando_pagamento')
       and i.status not in ('entregue','cancelado')
     order by p.criado_em, p.numero, i.seq`,
    [setorSlug],
  );
  const adics = rows.length
    ? await query<{ itemId: string; adicionalId: string; nome: string; preco: number }>(
        `select item_id as "itemId", adicional_id as "adicionalId", nome, preco from item_adicionais
         where item_id = any($1) order by id`,
        [rows.map((r) => r.id)],
      )
    : [];

  const tickets = new Map<string, TicketKds>();
  for (const r of rows) {
    let t = tickets.get(r.pedidoId);
    if (!t) {
      t = {
        pedidoId: r.pedidoId,
        numero: r.numero,
        mesaNumero: r.mesaNumero,
        clienteNome: r.clienteNome ?? undefined,
        criadoEm: r.criadoEm,
        status: "recebido",
        itens: [],
      };
      tickets.set(r.pedidoId, t);
    }
    t.itens.push({
      id: r.id,
      produtoId: r.produtoId,
      nome: r.nome,
      precoUnitario: r.precoUnitario,
      quantidade: r.quantidade,
      observacao: r.observacao ?? undefined,
      setorId: r.setorId,
      status: r.status,
      adicionais: adics.filter((a) => a.itemId === r.id).map((a) => ({ adicionalId: a.adicionalId, nome: a.nome, preco: a.preco })),
    });
  }
  return [...tickets.values()].map((t) => ({ ...t, status: menorStatus(t.itens) }));
}

/** avança todos os itens do ticket (pedido + setor) para o próximo status */
export async function avancarTicket(ctx: Ctx, pedidoId: string, setorSlug: string): Promise<StatusPedido> {
  exigirSetor(ctx, setorSlug);
  return tx(async (c) => {
    const itens = await query<{ id: string; status: StatusPedido }>(
      `select i.id, i.status from itens_pedido i join setores s on s.id = i.setor_id
       where i.pedido_id = $1 and s.slug = $2 and i.status not in ('entregue','cancelado') for update of i`,
      [pedidoId, setorSlug],
      c,
    );
    if (!itens.length) throw new ServiceError("Pedido não encontrado", "NAO_ENCONTRADO");
    const atual = menorStatus(itens);
    const prox = PROXIMO_STATUS[atual];
    if (!prox) throw new ServiceError("Ticket já finalizado", "CONFLITO");
    await c.query(`update itens_pedido set status = $2 where id = any($1) and status = $3`, [
      itens.map((i) => i.id),
      prox,
      atual,
    ]);
    await c.query(`update pedidos set atualizado_em = now() where id = $1`, [pedidoId]);
    return prox;
  });
}

/** volta um passo (toque errado no KDS) */
export async function voltarTicket(ctx: Ctx, pedidoId: string, setorSlug: string): Promise<void> {
  exigirSetor(ctx, setorSlug);
  await tx(async (c) => {
    await c.query(
      `update itens_pedido i set status = case i.status when 'preparando' then 'recebido' else 'preparando' end
       from setores s
       where s.id = i.setor_id and s.slug = $2 and i.pedido_id = $1 and i.status in ('preparando','pronto')`,
      [pedidoId, setorSlug],
    );
    await c.query(`update pedidos set atualizado_em = now() where id = $1`, [pedidoId]);
  });
}

// ------------------------------------------------------------------ garçom
/** garçom confirma a entrega dos itens prontos de um pedido */
export async function marcarEntregue(ctx: Ctx, pedidoId: string): Promise<void> {
  exigir(ctx, "garcom");
  const r = await um(`select id from pedidos where id = $1`, [pedidoId]);
  if (!r) throw new ServiceError("Pedido não encontrado", "NAO_ENCONTRADO");
  await tx(async (c) => {
    await c.query(`update itens_pedido set status = 'entregue' where pedido_id = $1 and status = 'pronto'`, [pedidoId]);
    await c.query(`update pedidos set atualizado_em = now() where id = $1`, [pedidoId]);
  });
}

export async function cancelarItem(ctx: Ctx, pedidoId: string, itemId: string): Promise<void> {
  exigir(ctx, "garcom");
  await tx(async (c) => {
    const r = await um<{ status: StatusPedido; comanda: string }>(
      `select i.status, cm.status as comanda
       from itens_pedido i join pedidos p on p.id = i.pedido_id join comandas cm on cm.id = p.comanda_id
       where i.id = $1 and i.pedido_id = $2 for update of i`,
      [itemId, pedidoId],
      c,
    );
    if (!r) throw new ServiceError("Item não encontrado", "NAO_ENCONTRADO");
    if (r.comanda === "fechada" || r.comanda === "cancelada") {
      throw new ServiceError("Comanda fechada não pode ser alterada", "PROIBIDO");
    }
    if (r.status === "entregue") throw new ServiceError("Item já entregue. Peça ao caixa para ajustar a conta.", "PROIBIDO");
    await c.query(`update itens_pedido set status = 'cancelado' where id = $1`, [itemId]);
    await c.query(`update pedidos set atualizado_em = now() where id = $1`, [pedidoId]);
  });
}

/** feed de avisos do garçom: chamados, pedidos prontos e contas */
export async function notificacoesGarcom(ctx: Ctx): Promise<Notificacao[]> {
  exigir(ctx, "garcom");
  const out: Notificacao[] = [];
  const cms = await query<{ id: string; mesaNumero: number; status: string; chamando: boolean; chamadoEm: string | null; abertaEm: string }>(
    `select c.id, m.numero as "mesaNumero", c.status, c.chamando_garcom as chamando,
            c.chamado_em as "chamadoEm", c.aberta_em as "abertaEm"
     from comandas c join mesas m on m.id = c.mesa_id
     where c.status in ('aberta','aguardando_pagamento')`,
  );
  for (const c of cms) {
    if (c.chamando && c.status === "aberta") {
      out.push({
        id: `ch_${c.id}`,
        tipo: "chamado",
        mesaNumero: c.mesaNumero,
        mensagem: "Cliente chamando o garçom",
        criadoEm: c.chamadoEm ?? c.abertaEm,
        refId: c.id,
      });
    }
    if (c.status === "aguardando_pagamento") {
      out.push({ id: `ct_${c.id}`, tipo: "conta", mesaNumero: c.mesaNumero, mensagem: "Pediu a conta", criadoEm: c.abertaEm, refId: c.id });
    }
  }
  const prontos = await query<{ pedidoId: string; mesaNumero: number; atualizadoEm: string; qtd: number; nome: string }>(
    `select p.id as "pedidoId", m.numero as "mesaNumero", p.atualizado_em as "atualizadoEm", i.quantidade as qtd, i.nome
     from itens_pedido i
     join pedidos p on p.id = i.pedido_id
     join comandas c on c.id = p.comanda_id
     join mesas m on m.id = c.mesa_id
     where i.status = 'pronto' and c.status in ('aberta','aguardando_pagamento')
     order by p.criado_em, i.seq`,
  );
  const porPedido = new Map<string, typeof prontos>();
  for (const r of prontos) porPedido.set(r.pedidoId, [...(porPedido.get(r.pedidoId) ?? []), r]);
  for (const [pedidoId, rs] of porPedido) {
    out.push({
      id: `pr_${pedidoId}`,
      tipo: "pronto",
      mesaNumero: rs[0].mesaNumero,
      mensagem: rs.map((r) => `${r.qtd}× ${r.nome}`).join(", "),
      criadoEm: rs[0].atualizadoEm,
      refId: pedidoId,
    });
  }
  const peso = { chamado: 0, pronto: 1, conta: 2 } as const;
  return out.sort((a, b) => peso[a.tipo] - peso[b.tipo] || a.criadoEm.localeCompare(b.criadoEm));
}
