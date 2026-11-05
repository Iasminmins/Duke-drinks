import type { Comanda, ComandaDetalhada, Mesa, StatusComanda } from "@/types";
import { rpc } from "./_rpc";

/** comandas em andamento (garçom e caixa) */
export function listarComandasAtivas(): Promise<ComandaDetalhada[]> {
  return rpc("listarComandasAtivas");
}

export function listarMesas(): Promise<Mesa[]> {
  return rpc("listarMesas");
}

export interface ComandaPublica {
  id: string;
  numero: number;
  status: StatusComanda;
  clienteNome?: string;
  clienteCelular?: string;
}

/** o cliente escaneou o QR da comanda: o token é o segredo dele */
export function entrarPorQr(token: string): Promise<ComandaPublica> {
  return rpc("entrarPorQr", token);
}

/** abre uma comanda individual; mesa e número do cartão são opcionais */
export function abrirComanda(dados: {
  nome: string;
  celular: string;
  mesaId?: string | null;
  numero?: number | null;
}): Promise<Comanda> {
  return rpc("abrirComanda", dados);
}

export function salvarMesa(dados: Omit<Mesa, "id"> & { id?: string }): Promise<Mesa> {
  return rpc("salvarMesa", dados);
}

export function excluirMesa(id: string): Promise<void> {
  return rpc("excluirMesa", id);
}
