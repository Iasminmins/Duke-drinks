"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, CreditCard, QrCode, Wallet, WalletCards, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { registrarPagamento } from "@/services/caixa.service";
import { useSession } from "@/stores/session";
import { FORMA_LABEL, FORMAS } from "@/lib/labels";
import { formatBRL } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { cn, round2 } from "@/lib/utils";
import type { ComandaDetalhada, FormaPagamento } from "@/types";

const ICONE: Record<FormaPagamento, LucideIcon> = {
  dinheiro: Banknote,
  pix: QrCode,
  debito: WalletCards,
  credito: CreditCard,
  outro: Wallet,
};

export function PagamentoDialog({ comanda, open, onClose }: { comanda: ComandaDetalhada; open: boolean; onClose: () => void }) {
  const usuario = useSession((s) => s.usuario)!;
  const restante = comanda.totais.restante;
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [valor, setValor] = useState(restante);
  const [recebido, setRecebido] = useState(restante);
  const [pessoas, setPessoas] = useState(2);

  useEffect(() => {
    if (open) {
      setValor(restante);
      setRecebido(restante);
      setForma("pix");
    }
  }, [open, restante]);

  const troco = forma === "dinheiro" ? round2(Math.max(recebido - valor, 0)) : 0;
  const erroValor = valor <= 0 ? "Informe o valor" : valor > restante + 0.001 ? `Máximo ${formatBRL(restante)}` : undefined;
  const erroRecebido = forma === "dinheiro" && recebido < valor ? "Recebido menor que o valor" : undefined;

  const m = useMutation({
    mutationFn: () => registrarPagamento({ comandaId: comanda.id, forma, valor, valorRecebido: forma === "dinheiro" ? recebido : undefined, usuarioId: usuario.id }),
    onSuccess: ({ comandaFechada }) => {
      toast.success(
        comandaFechada
          ? `Mesa ${comanda.mesaNumero} quitada e liberada`
          : `${FORMA_LABEL[forma]} de ${formatBRL(valor)} registrado`,
        { description: troco > 0 ? `Troco: ${formatBRL(troco)}` : undefined },
      );
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titulo={`Registrar pagamento · Mesa ${comanda.mesaNumero}`}
      descricao={`Restante a receber: ${formatBRL(restante)}`}
      largura="lg"
      rodape={
        <Button size="lg" block disabled={!!erroValor || !!erroRecebido} loading={m.isPending} onClick={() => m.mutate()}>
          Confirmar baixa de {formatBRL(valor)}
        </Button>
      }
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-muted">Forma de pagamento</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {FORMAS.map((f) => {
            const Icon = ICONE[f];
            return (
              <button
                key={f}
                type="button"
                aria-pressed={forma === f}
                onClick={() => setForma(f)}
                className={cn(
                  "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors",
                  forma === f ? "border-gold bg-gold-soft text-gold" : "border-line bg-surface text-muted hover:text-cream",
                )}
              >
                <Icon className="h-6 w-6" />
                {FORMA_LABEL[f]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Valor deste pagamento" htmlFor="pg-valor" erro={erroValor}>
          <MoneyInput id="pg-valor" value={valor} onChange={setValor} aria-invalid={!!erroValor} />
        </Field>
        {forma === "dinheiro" && (
          <Field label="Valor recebido" htmlFor="pg-recebido" erro={erroRecebido}>
            <MoneyInput id="pg-recebido" value={recebido} onChange={setRecebido} aria-invalid={!!erroRecebido} />
          </Field>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button className="rounded-full border border-line px-3 py-1.5 hover:bg-surface" onClick={() => setValor(restante)}>
          Valor total
        </button>
        <span className="text-subtle">Dividir por</span>
        <div className="flex items-center rounded-full border border-line">
          <button className="h-8 w-8" onClick={() => setPessoas((p) => Math.max(2, p - 1))} aria-label="Menos pessoas">−</button>
          <span className="w-5 text-center tabular-nums">{pessoas}</span>
          <button className="h-8 w-8" onClick={() => setPessoas((p) => Math.min(20, p + 1))} aria-label="Mais pessoas">+</button>
        </div>
        <button
          className="rounded-full border border-gold/50 px-3 py-1.5 text-gold hover:bg-gold-soft"
          onClick={() => setValor(Math.min(restante, round2(comanda.totais.total / pessoas)))}
        >
          {formatBRL(comanda.totais.total / pessoas)} por pessoa
        </button>
      </div>

      {forma === "dinheiro" && (
        <div className="mt-5 flex items-center justify-between rounded-card border border-ok/40 bg-ok-soft p-4">
          <span className="text-sm font-medium">Troco</span>
          <span className="font-display text-4xl text-ok">{formatBRL(troco)}</span>
        </div>
      )}
      {valor < restante && !erroValor && (
        <p className="mt-4 text-sm text-muted">
          Pagamento parcial. Depois desta baixa ainda faltarão <b className="text-cream">{formatBRL(restante - valor)}</b>.
        </p>
      )}
    </Dialog>
  );
}
