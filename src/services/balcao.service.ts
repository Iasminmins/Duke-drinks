import type { DocumentoFiscal, FormaPagamento, Produto, VendaBalcao } from "@/types";
import { rpc } from "./_rpc";

export interface ProdutoEstoque extends Pick<Produto, "id" | "nome" | "preco" | "codigoBarras" | "controlaEstoque" | "estoque" | "estoqueMinimo" | "unidade"> {}

export function buscarProdutoBalcao(codigo: string): Promise<ProdutoEstoque | null> {
  return rpc("buscarProdutoBalcao", codigo);
}
export function listarProdutosBalcao(): Promise<ProdutoEstoque[]> {
  return rpc("listarProdutosBalcao");
}
export function listarVendasBalcao(): Promise<VendaBalcao[]> {
  return rpc("listarVendasBalcao");
}
export function registrarVendaBalcao(dados: {
  itens: { produtoId: string; quantidade: number }[];
  forma: FormaPagamento;
  valorRecebido?: number;
  desconto?: number;
  clienteNome?: string;
  clienteDocumento?: string;
  emitirNfce: boolean;
}): Promise<VendaBalcao> {
  return rpc("registrarVendaBalcao", dados);
}
export function emitirNfce(vendaId: string): Promise<DocumentoFiscal> {
  return rpc("emitirNfce", vendaId);
}
export function listarEstoque(): Promise<ProdutoEstoque[]> {
  return rpc("listarEstoque");
}
export function listarMovimentosEstoque(): Promise<{ id: string; criadoEm: string; produtoNome: string; tipo: string; quantidade: number; observacao: string; usuarioNome: string }[]> {
  return rpc("listarMovimentosEstoque");
}
export function movimentarEstoque(dados: {
  produtoId: string;
  tipo: "entrada" | "saida" | "ajuste";
  quantidade: number;
  observacao?: string;
}): Promise<void> {
  return rpc("movimentarEstoque", dados);
}
