import { createHash } from "node:crypto";

/** Hash determinístico para vincular uma chave de repetição ao conteúdo da operação. */
export function hashOperacao(dados: unknown): string {
  return createHash("sha256").update(JSON.stringify(dados)).digest("hex");
}

/** O caixa usa unidades inteiras e aceita até 3 casas decimais para kg. */
export function quantidadeVendaValida(valor: number): boolean {
  if (!Number.isFinite(valor) || valor <= 0 || valor > 100_000) return false;
  const arredondada = Math.round(valor * 1000) / 1000;
  return Math.abs(valor - arredondada) <= 0.000001;
}

/** Produtos sem controle ativo não podem bloquear uma venda por saldo antigo. */
export function saldoPermiteVenda(controlaEstoque: boolean, saldo: number, quantidade: number): boolean {
  return !controlaEstoque || quantidade <= saldo;
}
