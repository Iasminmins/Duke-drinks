"use client";

import { useEffect, useRef, useState } from "react";
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
  const requestKey = useRef<string | null>(null);
  const dadosTentativa = useRef<{ comandaId: string; forma: FormaPagamento; valor: number; valorRecebido?: number; requestKey: string } | null>(null);
  const [tentativaRecuperada, setTentativaRecuperada] = useState(false);

  useEffect(() => {
    if (open) {
      try {
        const guardada = localStorage.getItem(`comandou:tentativa-pagamento:${window.location.hostname}:${comanda.id}`);
        const dados = guardada ? JSON.parse(guardada) : null;
        if (dados?.comandaId === comanda.id && typeof dados.requestKey === "string" && Number.isFinite(dados.valor)) {
          dadosTentativa.current = dados;
          requestKey.current = dados.requestKey;
          setValor(dados.valor);
          setRecebido(dados.valorRecebido ?? dados.valor);
          setForma(dados.forma);
          setTentativaRecuperada(true);
          return;
        }
      } catch { /* usa o formulário novo se o armazenamento não estiver disponível */ }
      dadosTentativa.current = null;
      requestKey.current = null;
      setTentativaRecuperada(false);
      setValor(restante);
      setRecebido(restante);
      setForma("pix");
    }
  }, [open, restante, comanda.id]);

  const troco = forma === "dinheiro" ? round2(Math.max(recebido - valor, 0)) : 0;
  const erroValor = tentativaRecuperada ? undefined : valor <= 0 ? "Informe o valor" : valor > restante + 0.001 ? `Máximo ${formatBRL(restante)}` : undefined;
  const erroRecebido = tentativaRecuperada || forma !== "dinheiro" || recebido >= valor ? undefined : "Recebido menor que o valor";

  const m = useMutation({
    mutationFn: () => {
      if (!dadosTentativa.current) {
        requestKey.current ??= crypto.randomUUID();
        dadosTentativa.current = { comandaId: comanda.id, forma, valor, valorRecebido: forma === "dinheiro" ? recebido : undefined, requestKey: requestKey.current };
        try { localStorage.setItem(`comandou:tentativa-pagamento:${window.location.hostname}:${comanda.id}`, JSON.stringify(dadosTentativa.current)); } catch { /* chave mantida em memória */ }
      }
      const d = dadosTentativa.current;
      return registrarPagamento({ ...d!, usuarioId: usuario.id });
    },
    onSuccess: ({ comandaFechada }) => {
      toast.success(
        comandaFechada
          ? `Comanda ${comanda.numero} quitada`
          : `${FORMA_LABEL[forma]} de ${formatBRL(valor)} registrado`,
        { description: troco > 0 ? `Troco: ${formatBRL(troco)}` : undefined },
      );
      try { localStorage.removeItem(`comandou:tentativa-pagamento:${window.location.hostname}:${comanda.id}`); } catch { /* armazenamento opcional */ }
      dadosTentativa.current = null;
      requestKey.current = null;
      setTentativaRecuperada(false);
      onClose();
    },
    onError: (e) => { setTentativaRecuperada(true); toast.error(mensagemErro(e)); },
  });
  const tentativaBloqueada = tentativaRecuperada || m.isError;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titulo={`Registrar pagamento · Comanda ${comanda.numero}`}
      descricao={`Restante a receber: ${formatBRL(restante)}`}
      largura="lg"
      rodape={
        <Button size="lg" block disabled={!!erroValor || !!erroRecebido} loading={m.isPending} onClick={() => m.mutate()}>
          {tentativaBloqueada ? "Tentar novamente · mesma baixa" : "Confirmar baixa"} de {formatBRL(valor)}
        </Button>
      }
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-muted">Forma de pagamento</legend>
        {tentativaBloqueada && <p className="mb-2 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm text-warn">Esta baixa ficou aguardando confirmação. A nova tentativa enviará exatamente o mesmo valor e forma de pagamento.</p>}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {FORMAS.map((f) => {
            const Icon = ICONE[f];
            return (
              <button
                key={f}
                type="button"
                aria-pressed={forma === f}
                disabled={tentativaBloqueada}
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
      {tentativaBloqueada && <button type="button" className="mt-3 text-xs text-muted underline" onClick={() => {
        if (!window.confirm("Confira o caixa/histórico antes de limpar. Só faça isso se esta baixa não aparecer nos pagamentos. Deseja iniciar uma nova tentativa?")) return;
        try { localStorage.removeItem(`comandou:tentativa-pagamento:${window.location.hostname}:${comanda.id}`); } catch { /* armazenamento opcional */ }
        dadosTentativa.current = null;
        requestKey.current = null;
        setTentativaRecuperada(false);
        setValor(restante);
        setRecebido(restante);
        setForma("pix");
        m.reset();
      }}>Conferi o histórico · limpar tentativa pendente</button>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Valor deste pagamento" htmlFor="pg-valor" erro={erroValor}>
          <MoneyInput id="pg-valor" value={valor} onChange={setValor} aria-invalid={!!erroValor} disabled={tentativaBloqueada} />
        </Field>
        {forma === "dinheiro" && (
          <Field label="Valor recebido" htmlFor="pg-recebido" erro={erroRecebido}>
            <MoneyInput id="pg-recebido" value={recebido} onChange={setRecebido} aria-invalid={!!erroRecebido} disabled={tentativaBloqueada} />
          </Field>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button disabled={tentativaBloqueada} className="rounded-full border border-line px-3 py-1.5 hover:bg-surface disabled:opacity-50" onClick={() => setValor(restante)}>
          Valor total
        </button>
        <span className="text-subtle">Dividir por</span>
        <div className="flex items-center rounded-full border border-line">
          <button disabled={tentativaBloqueada} className="h-8 w-8" onClick={() => setPessoas((p) => Math.max(2, p - 1))} aria-label="Menos pessoas">−</button>
          <span className="w-5 text-center tabular-nums">{pessoas}</span>
          <button disabled={tentativaBloqueada} className="h-8 w-8" onClick={() => setPessoas((p) => Math.min(20, p + 1))} aria-label="Mais pessoas">+</button>
        </div>
        <button
          disabled={tentativaBloqueada}
          className="rounded-full border border-gold/50 px-3 py-1.5 text-gold hover:bg-gold-soft disabled:opacity-50"
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
