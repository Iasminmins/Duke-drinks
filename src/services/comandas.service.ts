import type { ComandaDetalhada, StatusComanda } from "@/types";
import { rpc } from "./_rpc";

/**
 * Equipe logada acessa sem código. O cliente (QR) passa o código da própria comanda.
 */
export function getComanda(id: string, codigo?: string): Promise<ComandaDetalhada> {
  return rpc("getComanda", id, codigo);
}

export function listarComandas(status: StatusComanda[]): Promise<ComandaDetalhada[]> {
  return rpc("listarComandas", status);
}

export interface FiltroHistorico {
  de?: string; // yyyy-mm-dd
  ate?: string;
  forma?: string;
  operadorId?: string;
}

export function historicoComandas(f: FiltroHistorico): Promise<ComandaDetalhada[]> {
  return rpc("historicoComandas", f);
}

/** valida o código que o garçom passou ao cliente */
export function validarCodigo(comandaId: string, codigo: string): Promise<boolean> {
  return rpc("validarCodigo", comandaId, codigo);
}

export function chamarGarcom(comandaId: string, codigo?: string): Promise<void> {
  return rpc("chamarGarcom", comandaId, codigo);
}

export function atenderChamado(comandaId: string): Promise<void> {
  return rpc("atenderChamado", comandaId);
}

export function pedirConta(comandaId: string, codigo?: string): Promise<void> {
  return rpc("pedirConta", comandaId, codigo);
}

/** devolve a comanda para "aberta" (cliente quer pedir mais depois de pedir a conta) */
export function reabrirComanda(comandaId: string): Promise<void> {
  return rpc("reabrirComanda", comandaId);
}

export function ajustarComanda(
  comandaId: string,
  ajustes: { cobrarTaxaServico?: boolean; desconto?: number },
): Promise<void> {
  return rpc("ajustarComanda", comandaId, ajustes);
}

/** o usuário vem da sessão no servidor; o 2º argumento é ignorado (mantido por compatibilidade) */
export function cancelarComanda(comandaId: string, _usuarioId?: string): Promise<void> {
  void _usuarioId;
  return rpc("cancelarComanda", comandaId);
}

/** garçom corrige/completa nome e celular da comanda */
export function atualizarCliente(comandaId: string, nome: string, celular: string): Promise<void> {
  return rpc("atualizarCliente", comandaId, nome, celular);
}

/** cliente informa nome e celular no QR (exige o código da comanda) */
export function identificarCliente(comandaId: string, codigo: string, nome: string, celular: string): Promise<void> {
  return rpc("identificarCliente", comandaId, codigo, nome, celular);
}
