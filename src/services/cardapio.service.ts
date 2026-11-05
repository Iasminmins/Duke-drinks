import type { Adicional, Categoria, Produto, Setor } from "@/types";
import { rpc } from "./_rpc";

export interface Cardapio {
  categorias: Categoria[];
  produtos: Produto[];
  adicionais: Adicional[];
  setores: Setor[];
}

/** cardápio público (só itens ativos, categorias ativas) */
export function getCardapio(): Promise<Cardapio> {
  return rpc("getCardapio");
}

/** cardápio completo para o admin */
export function getCardapioAdmin(): Promise<Cardapio> {
  return rpc("getCardapioAdmin");
}

// ---------- produtos
export function salvarProduto(dados: Omit<Produto, "id"> & { id?: string }): Promise<Produto> {
  return rpc("salvarProduto", dados);
}

export function alternarEsgotado(id: string): Promise<Produto> {
  return rpc("alternarEsgotado", id);
}

/** soft delete: o produto continua no histórico dos pedidos */
export function excluirProduto(id: string): Promise<void> {
  return rpc("excluirProduto", id);
}

// ---------- categorias
export function salvarCategoria(dados: Omit<Categoria, "id"> & { id?: string }): Promise<Categoria> {
  return rpc("salvarCategoria", dados);
}

export function excluirCategoria(id: string): Promise<void> {
  return rpc("excluirCategoria", id);
}

// ---------- adicionais
export function salvarAdicional(dados: Omit<Adicional, "id"> & { id?: string }): Promise<Adicional> {
  return rpc("salvarAdicional", dados);
}

export function excluirAdicional(id: string): Promise<void> {
  return rpc("excluirAdicional", id);
}

// ---------- setores
export function salvarSetor(dados: Omit<Setor, "id"> & { id?: string }): Promise<Setor> {
  return rpc("salvarSetor", dados);
}

export function excluirSetor(id: string): Promise<void> {
  return rpc("excluirSetor", id);
}
