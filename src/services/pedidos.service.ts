import type { Notificacao, Pedido, StatusPedido, TicketKds } from "@/types";
import { rpc } from "./_rpc";

export interface NovoItem {
  produtoId: string;
  quantidade: number;
  adicionaisIds: string[];
  observacao?: string;
}

export interface NovoPedido {
  comandaId: string;
  origem: "cliente" | "garcom";
  itens: NovoItem[];
  /** obrigatório quando origem = cliente */
  codigo?: string;
}

export function criarPedido(dados: NovoPedido): Promise<Pedido> {
  return rpc("criarPedido", dados);
}

/** tickets do KDS de um setor (cozinha/bar) */
export function listarTickets(setorSlug: string): Promise<TicketKds[]> {
  return rpc("listarTickets", setorSlug);
}

/** avança todos os itens do ticket (pedido + setor) para o próximo status */
export function avancarTicket(pedidoId: string, setorSlug: string): Promise<StatusPedido> {
  return rpc("avancarTicket", pedidoId, setorSlug);
}

/** volta um passo (toque errado no KDS) */
export function voltarTicket(pedidoId: string, setorSlug: string): Promise<void> {
  return rpc("voltarTicket", pedidoId, setorSlug);
}

/** garçom confirma a entrega dos itens prontos de um pedido */
export function marcarEntregue(pedidoId: string): Promise<void> {
  return rpc("marcarEntregue", pedidoId);
}

export function cancelarItem(pedidoId: string, itemId: string): Promise<void> {
  return rpc("cancelarItem", pedidoId, itemId);
}

/** feed de avisos do garçom: chamados, pedidos prontos e contas */
export function notificacoesGarcom(): Promise<Notificacao[]> {
  return rpc("notificacoesGarcom");
}
