"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, LockKeyhole, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { SkeletonLista } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { abrirCaixa, fecharCaixa, getCaixaAberto, resumoCaixa } from "@/services/caixa.service";
import { useSession } from "@/stores/session";
import { FORMA_LABEL, FORMAS } from "@/lib/labels";
import { formatBRL, formatDataHora } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { cn, round2 } from "@/lib/utils";
import type { FormaPagamento } from "@/types";

export default function CaixaDoDia() {
  const caixaQ = useQuery({ queryKey: ["caixa-aberto"], queryFn: getCaixaAberto });
  if (caixaQ.isLoading) return <SkeletonLista />;
  return caixaQ.data ? <Fechamento caixaId={caixaQ.data.id} /> : <Abertura />;
}

function Abertura() {
  const usuario = useSession((s) => s.usuario)!;
  const [fundo, setFundo] = useState(200);
  const m = useMutation({
    mutationFn: () => abrirCaixa(fundo, usuario.id),
    onSuccess: () => toast.success("Caixa aberto. Bom expediente!"),
    onError: (e) => toast.error(mensagemErro(e)),
  });
  return (
    <div className="mx-auto max-w-md pt-6">
      <Card className="p-6">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-gold-soft text-gold">
          <Wallet className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-3xl">Abrir caixa</h2>
        <p className="mt-1 text-sm text-muted">Informe o fundo de troco que está na gaveta agora.</p>
        <Field label="Fundo de troco" htmlFor="fundo" className="mt-6">
          <MoneyInput id="fundo" value={fundo} onChange={setFundo} autoFocus />
        </Field>
        <Button size="lg" block className="mt-6" loading={m.isPending} onClick={() => m.mutate()}>
          Abrir caixa com {formatBRL(fundo)}
        </Button>
      </Card>
    </div>
  );
}

function Fechamento({ caixaId }: { caixaId: string }) {
  const usuario = useSession((s) => s.usuario)!;
  const q = useQuery({ queryKey: ["resumo-caixa", caixaId], queryFn: () => resumoCaixa(caixaId) });
  const [contado, setContado] = useState<Partial<Record<FormaPagamento, number>>>({});
  const [confirmar, setConfirmar] = useState(false);

  const fechar = useMutation({
    mutationFn: () => fecharCaixa(caixaId, contado, usuario.id),
    onSuccess: () => {
      toast.success("Caixa fechado e conferido");
      setConfirmar(false);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  if (q.isLoading || !q.data) return <SkeletonLista />;
  const r = q.data;

  // no dinheiro, o esperado é o que deve estar na gaveta (fundo + entradas)
  const esperado = (f: FormaPagamento) => (f === "dinheiro" ? r.dinheiroGaveta : r.esperado[f]);
  const linhas = FORMAS.map((f) => {
    const c = contado[f];
    return { forma: f, esperado: esperado(f), contado: c, diferenca: c === undefined ? null : round2(c - esperado(f)) };
  });
  const totalDif = round2(linhas.reduce((s, l) => s + (l.diferenca ?? 0), 0));
  const algumContado = linhas.some((l) => l.contado !== undefined);
  const faltaContar = linhas.some((l) => l.contado === undefined && l.esperado > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Vendas do caixa" valor={formatBRL(r.totalVendas)} destaque />
        <Kpi label="Fundo inicial" valor={formatBRL(r.caixa.fundoInicial)} />
        <Kpi label="Troco entregue" valor={formatBRL(r.trocoDado)} />
        <Kpi label="Aberto em" valor={formatDataHora(r.caixa.abertoEm)} />
      </div>

      {r.comandasEmAberto > 0 && (
        <div className="flex items-center gap-3 rounded-card border border-warn/50 bg-warn-soft p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warn" />
          Ainda há <b>{r.comandasEmAberto} comanda(s)</b> em aberto. O ideal é quitar todas antes de fechar o caixa.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Conferência: esperado × contado</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-subtle">
                <th className="px-4 py-3 font-medium">Forma</th>
                <th className="px-4 py-3 text-right font-medium">Lançamentos</th>
                <th className="px-4 py-3 text-right font-medium">Esperado</th>
                <th className="px-4 py-3 font-medium">Contado</th>
                <th className="px-4 py-3 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {linhas.map((l) => (
                <tr key={l.forma}>
                  <td className="px-4 py-3 font-medium">
                    {FORMA_LABEL[l.forma]}
                    {l.forma === "dinheiro" && <span className="block text-xs font-normal text-subtle">inclui fundo de troco</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{r.quantidade[l.forma]}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(l.esperado)}</td>
                  <td className="w-48 px-4 py-2">
                    <MoneyInput
                      aria-label={`Valor contado em ${FORMA_LABEL[l.forma]}`}
                      value={l.contado ?? 0}
                      onChange={(v) => setContado((c) => ({ ...c, [l.forma]: v }))}
                    />
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-semibold tabular-nums",
                      l.diferenca === null ? "text-subtle" : l.diferenca === 0 ? "text-ok" : l.diferenca > 0 ? "text-info" : "text-[#ff6b7f]",
                    )}
                  >
                    {l.diferenca === null ? "—" : l.diferenca === 0 ? "OK" : formatBRL(l.diferenca)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={4} className="px-4 py-3 text-right font-semibold">Diferença total</td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-display text-2xl",
                    !algumContado ? "text-subtle" : totalDif === 0 ? "text-ok" : totalDif > 0 ? "text-info" : "text-[#ff6b7f]",
                  )}
                >
                  {algumContado ? formatBRL(totalDif) : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-xs text-subtle">
            Sobra aparece em azul, falta em vermelho. Para o Pix e cartões, confira com o extrato da maquininha e do banco.
          </p>
          <Button size="lg" variant="danger" onClick={() => setConfirmar(true)}>
            <LockKeyhole className="h-5 w-5" /> Fechar caixa
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={() => fechar.mutate()}
        loading={fechar.isPending}
        perigo
        titulo="Fechar o caixa?"
        descricao={
          faltaContar
            ? "Algumas formas com movimento ainda não foram contadas. Depois de fechado, não dá para estornar pagamentos deste caixa."
            : `Diferença total: ${formatBRL(totalDif)}. Depois de fechado, não dá para estornar pagamentos deste caixa.`
        }
        confirmar="Fechar caixa"
      />
    </div>
  );
}

function Kpi({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <Card className={cn("p-4", destaque && "border-gold/50")}>
      <p className="text-xs uppercase tracking-wider text-subtle">{label}</p>
      <p className={cn("mt-1 font-display text-3xl", destaque && "text-gold")}>{valor}</p>
    </Card>
  );
}
