"use client";

import type { Estabelecimento, VendaBalcao } from "@/types";
import Image from "next/image";
import { formatBRL } from "@/lib/format";
import { FORMA_LABEL } from "@/lib/labels";

function quantidade(qtd: number, unidade: string) {
  if (unidade.toLowerCase() === "kg") {
    return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(qtd)} kg`;
  }
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(qtd)} ${unidade}`;
}

export function ComprovanteVenda({ venda, estabelecimento }: { venda: VendaBalcao; estabelecimento?: Estabelecimento }) {
  return (
    <section className="comprovante-venda" aria-label={`Comprovante de venda número ${venda.numero}`}>
      <header className="comprovante-cabecalho">
        <Image src="/brand/receipt-checkmark-small.png" alt="" aria-hidden width={220} height={214} className="comprovante-logo" />
        <h1>{estabelecimento?.nome || "Comprovante de venda"}</h1>
        {estabelecimento?.endereco && <p>{estabelecimento.endereco}</p>}
        <strong>COMPROVANTE DE VENDA</strong>
      </header>

      <div className="comprovante-meta">
        <span>Venda #{venda.numero}</span>
        <time dateTime={venda.criadoEm}>{new Date(venda.criadoEm).toLocaleString("pt-BR")}</time>
      </div>

      <div className="comprovante-itens">
        <div className="comprovante-colunas"><span>Item</span><span>Qtd. × valor</span><span>Total</span></div>
        {venda.itens.map((item, index) => (
          <div className="comprovante-item" key={`${item.nome}-${index}`}>
            <b>{item.nome}</b>
            <span>{quantidade(item.quantidade, item.unidade)} × {formatBRL(item.precoUnitario)}</span>
            <strong>{formatBRL(item.total)}</strong>
          </div>
        ))}
      </div>

      <div className="comprovante-totais">
        <p><span>Subtotal</span><span>{formatBRL(venda.subtotal)}</span></p>
        {venda.desconto > 0 && <p><span>Desconto</span><span>− {formatBRL(venda.desconto)}</span></p>}
        <p className="comprovante-total"><b>Total</b><b>{formatBRL(venda.total)}</b></p>
      </div>

      <footer className="comprovante-pagamento">
        <p><span>Pagamento</span><b>{FORMA_LABEL[venda.pagamento.forma]}</b></p>
        {venda.pagamento.valorRecebido !== undefined && <p><span>Valor recebido</span><span>{formatBRL(venda.pagamento.valorRecebido)}</span></p>}
        {venda.pagamento.troco !== undefined && venda.pagamento.troco > 0 && <p><span>Troco</span><span>{formatBRL(venda.pagamento.troco)}</span></p>}
        <p className="comprovante-obrigado">Obrigado pela preferência!</p>
      </footer>
    </section>
  );
}
