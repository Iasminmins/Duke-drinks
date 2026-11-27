import type { Estabelecimento, Usuario } from "@/types";
import type { EstadoFiscal } from "@/server/handlers/acesso";
import { rpc } from "./_rpc";
import type { TipoNegocio } from "@/lib/planos";

export function getEstabelecimento(): Promise<Estabelecimento> {
  return rpc("getEstabelecimento");
}

export function getTipoNegocio(): Promise<string> {
  return rpc("getTipoNegocio");
}

export interface EstabelecimentoAcessivel {
  id: string;
  slug: string;
  nome: string;
  atual: boolean;
}

export function listarEstabelecimentosAcessiveis(): Promise<EstabelecimentoAcessivel[]> {
  return rpc("listarEstabelecimentosAcessiveis");
}

export function alternarEstabelecimento(id: string): Promise<{ slug: string; nome: string; usuario: Usuario }> {
  return rpc("alternarEstabelecimento", id);
}

export function aplicarModeloTipoNegocio(tipo: TipoNegocio): Promise<{ tipo: TipoNegocio; categoriasAdicionadas: string[]; setoresAdicionados: string[] }> {
  return rpc("aplicarModeloTipoNegocio", tipo);
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
