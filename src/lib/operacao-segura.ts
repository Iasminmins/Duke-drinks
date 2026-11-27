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

/** Venda só pode ser revertida no caixa aberto quando não existe documento fiscal associado. */
export function vendaBalcaoPodeSerEstornada(dados: {
  status: string;
  caixaFechado: boolean;
  fiscalStatus?: string | null;
}): boolean {
  return dados.status === "concluida" && !dados.caixaFechado && !dados.fiscalStatus;
}

/** Regras de entrada de pedidos após bloquear a comanda na transação. */
export function pedidoPodeSerCriado(dados: { status: string; origem: "cliente" | "garcom"; codigoValido: boolean }): boolean {
  return dados.status === "aberta" && (dados.origem === "garcom" || dados.codigoValido);
}
