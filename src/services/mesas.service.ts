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

/** cartão de comanda físico (número impresso), com quem está usando agora */
export interface Cartao {
  numero: number;
  emUso: boolean;
  clienteNome?: string;
}

export function listarCartoes(): Promise<Cartao[]> {
  return rpc("listarCartoes");
}

/** número + QR fixo do cartão (para imprimir) */
export interface CartaoImpressao {
  numero: number;
  token: string;
}

export function listarCartoesImpressao(): Promise<CartaoImpressao[]> {
  return rpc("listarCartoesImpressao");
}

/** resultado de escanear o QR fixo de um cartão */
export interface EntradaCartao {
  numero: number;
  /** livre: sem comanda aberta · confirmar: pedir os 4 últimos do celular · liberada: segue com o token */
  situacao: "livre" | "confirmar" | "liberada";
  token?: string;
}

export function entrarPorCartao(token: string, ultimos?: string): Promise<EntradaCartao> {
  return rpc("entrarPorCartao", token, ultimos);
}

export function adicionarCartoes(de: number, ate: number): Promise<{ adicionados: number }> {
  return rpc("adicionarCartoes", de, ate);
}

export function removerCartao(numero: number): Promise<void> {
  return rpc("removerCartao", numero);
}

export function salvarMesa(dados: Omit<Mesa, "id"> & { id?: string }): Promise<Mesa> {
  return rpc("salvarMesa", dados);
}

export function excluirMesa(id: string): Promise<void> {
  return rpc("excluirMesa", id);
}
