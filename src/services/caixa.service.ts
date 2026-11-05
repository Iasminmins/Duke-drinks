import type { Caixa, FormaPagamento, Pagamento } from "@/types";
import { rpc } from "./_rpc";

export function getCaixaAberto(): Promise<Caixa | null> {
  return rpc("getCaixaAberto");
}

/** o usuário vem da sessão no servidor; o 2º argumento é ignorado (mantido por compatibilidade) */
export function abrirCaixa(fundoInicial: number, _usuarioId?: string): Promise<Caixa> {
  void _usuarioId;
  return rpc("abrirCaixa", fundoInicial);
}

export interface NovoPagamento {
  comandaId: string;
  forma: FormaPagamento;
  valor: number;
  valorRecebido?: number;
  /** ignorado: o servidor usa o usuário da sessão */
  usuarioId?: string;
}

/** registra a baixa; fecha a comanda automaticamente quando total pago >= total */
export function registrarPagamento(dados: NovoPagamento): Promise<{ pagamento: Pagamento; comandaFechada: boolean }> {
  return rpc("registrarPagamento", dados);
}

/** estorno: comanda fechada volta para "aguardando pagamento" */
export function estornarPagamento(pagamentoId: string, motivo: string, _usuarioId?: string): Promise<void> {
  void _usuarioId;
  return rpc("estornarPagamento", pagamentoId, motivo);
}

export interface ResumoCaixa {
  caixa: Caixa;
  esperado: Record<FormaPagamento, number>;
  quantidade: Record<FormaPagamento, number>;
  trocoDado: number;
  totalVendas: number;
  /** dinheiro que deve estar na gaveta = fundo + dinheiro recebido - troco */
  dinheiroGaveta: number;
  comandasEmAberto: number;
}

export function resumoCaixa(caixaId: string): Promise<ResumoCaixa> {
  return rpc("resumoCaixa", caixaId);
}

export function fecharCaixa(
  caixaId: string,
  contados: Partial<Record<FormaPagamento, number>>,
  _usuarioId?: string,
): Promise<Caixa> {
  void _usuarioId;
  return rpc("fecharCaixa", caixaId, contados);
}
