import type { Estabelecimento } from "@/types";
import { rpc } from "./_rpc";

export function getEstabelecimento(): Promise<Estabelecimento> {
  return rpc("getEstabelecimento");
}

export function salvarEstabelecimento(dados: Partial<Omit<Estabelecimento, "id">>): Promise<Estabelecimento> {
  return rpc("salvarEstabelecimento", dados);
}

/** apaga o movimento (comandas, pedidos, pagamentos). Desativado por padrão no servidor. */
export function resetarDemo(): Promise<void> {
  return rpc("resetarDemo");
}
