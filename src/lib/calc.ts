import type { Comanda, ItemPedido, Pagamento, Pedido, TotaisComanda } from "@/types";
import { round2 } from "./utils";

export function totalItem(item: Pick<ItemPedido, "precoUnitario" | "quantidade" | "adicionais">) {
  const adicionais = item.adicionais.reduce((s, a) => s + a.preco, 0);
  return round2((item.precoUnitario + adicionais) * item.quantidade);
}

export function calcularTotais(
  comanda: Pick<Comanda, "cobrarTaxaServico" | "desconto">,
  pedidos: Pedido[],
  pagamentos: Pagamento[],
  taxaPercent: number,
): TotaisComanda {
  const subtotal = round2(
    pedidos
      .flatMap((p) => p.itens)
      .filter((i) => i.status !== "cancelado")
      .reduce((s, i) => s + totalItem(i), 0),
  );
  const taxaServico = comanda.cobrarTaxaServico ? round2((subtotal * taxaPercent) / 100) : 0;
  const desconto = Math.min(comanda.desconto || 0, subtotal + taxaServico);
  const total = round2(subtotal + taxaServico - desconto);
  const pago = round2(pagamentos.filter((p) => !p.estornado).reduce((s, p) => s + p.valor, 0));
  return { subtotal, taxaServico, desconto, total, pago, restante: round2(Math.max(total - pago, 0)) };
}
