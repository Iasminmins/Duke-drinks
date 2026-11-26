import type { Estabelecimento } from "@/types";
import type { EstadoFiscal } from "@/server/handlers/acesso";
import { rpc } from "./_rpc";

export function getEstabelecimento(): Promise<Estabelecimento> {
  return rpc("getEstabelecimento");
}

export function getEstadoFiscal(): Promise<EstadoFiscal> {
  return rpc("getEstadoFiscal");
}

export function salvarEstabelecimento(dados: Partial<Omit<Estabelecimento, "id">>): Promise<Estabelecimento> {
  return rpc("salvarEstabelecimento", dados);
}

/** apaga o movimento (comandas, pedidos, pagamentos). Desativado por padrão no servidor. */
export function resetarDemo(): Promise<void> {
  return rpc("resetarDemo");
}
