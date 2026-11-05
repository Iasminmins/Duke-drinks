"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Banknote, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/ui/money-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PagamentoDialog } from "./pagamento-dialog";
import { EstornoDialog } from "./estorno-dialog";
import { ajustarComanda, cancelarComanda } from "@/services/comandas.service";
import { useSession } from "@/stores/session";
import { FORMA_LABEL } from "@/lib/labels";
import { formatBRL, formatHora } from "@/lib/format";
import { totalItem } from "@/lib/calc";
import { mensagemErro } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { ComandaDetalhada, Pagamento } from "@/types";

export function ComandaDetalhe({
  comanda,
  taxaPercent,
  caixaAberto,
  somenteLeitura,
}: {
  comanda: ComandaDetalhada;
  taxaPercent: number;
  caixaAberto: boolean;
  somenteLeitura?: boolean;
}) {
  const usuario = useSession((s) => s.usuario)!;
  const [pagar, setPagar] = useState(false);
  const [estornar, setEstornar] = useState<Pagamento | null>(null);
  const [cancelar, setCancelar] = useState(false);
  const [desconto, setDesconto] = useState(comanda.desconto);
  useEffect(() => {
    setDesconto(comanda.desconto);
  }, [comanda.id, comanda.desconto]);

  const fechada = comanda.status === "fechada" || comanda.status === "cancelada";
  const editavel = !fechada && !somenteLeitura;
  const t = comanda.totais;

  const ajustar = useMutation({
    mutationFn: (a: { cobrarTaxaServico?: boolean; desconto?: number }) => ajustarComanda(comanda.id, a),
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const cancelarM = useMutation({
    mutationFn: () => cancelarComanda(comanda.id, usuario.id),
    onSuccess: () => {
      toast.success("Comanda cancelada");
      setCancelar(false);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const itens = comanda.pedidos.flatMap((p) => p.itens);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 lg:px-6">
        <span className="font-display text-5xl leading-none text-gold">{comanda.mesaNumero}</span>
        <div>
          <p className="font-display text-2xl leading-none">Mesa {comanda.mesaNumero}{comanda.clienteNome ? ` · ${comanda.clienteNome}` : ""}</p>
          <p className="text-xs text-muted">
            Aberta {formatHora(comanda.abertaEm)}
            {comanda.fechadaEm && ` · fechada ${formatHora(comanda.fechadaEm)}`}
          </p>
        </div>
        <div className="ml-auto"><StatusBadge tipo="comanda" status={comanda.status} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:px-6">
        {/* itens */}
        <table className="w-full text-sm">
          <caption className="sr-only">Itens da comanda</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-subtle">
              <th className="pb-2 font-medium">Qtd</th>
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Unit.</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((i) => (
              <tr key={i.id} className={cn(i.status === "cancelado" && "text-subtle line-through")}>
                <td className="py-2 pr-2 font-semibold tabular-nums">{i.quantidade}×</td>
                <td className="py-2">
                  {i.nome}
                  {i.adicionais.length > 0 && <span className="block text-xs text-muted">+ {i.adicionais.map((a) => `${a.nome} (${formatBRL(a.preco)})`).join(", ")}</span>}
                </td>
                <td className="py-2 text-right tabular-nums text-muted">{formatBRL(i.precoUnitario)}</td>
                <td className="py-2 text-right tabular-nums">{formatBRL(totalItem(i))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {itens.length === 0 && <p className="py-6 text-center text-sm text-subtle">Nenhum item lançado.</p>}

        {/* ajustes + totais */}
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="space-y-3 rounded-card border border-line bg-bg-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="taxa" className="text-sm">
                Taxa de serviço ({taxaPercent}%)
                <span className="block text-xs text-subtle">Opcional para o cliente</span>
              </label>
              <Switch
                id="taxa"
                checked={comanda.cobrarTaxaServico}
                disabled={!editavel || ajustar.isPending}
                onChange={(v) => ajustar.mutate({ cobrarTaxaServico: v })}
              />
            </div>
            <div>
              <label htmlFor="desc" className="mb-1.5 block text-sm">Desconto</label>
              <div className="flex gap-2">
                <MoneyInput id="desc" value={desconto} onChange={setDesconto} disabled={!editavel} className="flex-1" />
                <Button
                  variant="secondary"
                  disabled={!editavel || desconto === comanda.desconto}
                  loading={ajustar.isPending}
                  onClick={() => ajustar.mutate({ desconto }, { onSuccess: () => toast.success("Desconto aplicado") })}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>

          <dl className="space-y-1.5 rounded-card border border-line bg-bg-soft p-4 text-sm">
            <Row l="Subtotal" v={t.subtotal} />
            <Row l={`Serviço ${comanda.cobrarTaxaServico ? `(${taxaPercent}%)` : "(não cobrado)"}`} v={t.taxaServico} />
            {t.desconto > 0 && <Row l="Desconto" v={-t.desconto} />}
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-3xl">{formatBRL(t.total)}</dd>
            </div>
            <Row l="Pago" v={t.pago} className="text-ok" />
            <div className="flex items-baseline justify-between">
              <dt className="font-semibold">Restante</dt>
              <dd className={cn("font-display text-3xl", t.restante > 0 ? "text-gold" : "text-ok")}>{formatBRL(t.restante)}</dd>
            </div>
          </dl>
        </div>

        {/* pagamentos */}
        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-subtle">Pagamentos</h3>
        {comanda.pagamentos.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-4 text-center text-sm text-subtle">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line">
            {comanda.pagamentos.map((p) => (
              <li key={p.id} className={cn("flex items-center gap-3 px-3 py-2.5", p.estornado && "opacity-60")}>
                <Banknote className="h-4 w-4 text-muted" />
                <div className="min-w-0 flex-1 text-sm">
                  <span className={cn("font-medium", p.estornado && "line-through")}>{FORMA_LABEL[p.forma]}</span>
                  <span className="ml-2 text-xs text-subtle">{formatHora(p.criadoEm)}</span>
                  {p.troco ? <span className="ml-2 text-xs text-muted">troco {formatBRL(p.troco)}</span> : null}
                  {p.estornado && <span className="block text-xs text-[#ff6b7f]">Estornado: {p.motivoEstorno}</span>}
                </div>
                {p.estornado && <Badge tom="red">Estornado</Badge>}
                <span className="tabular-nums">{formatBRL(p.valor)}</span>
                {!p.estornado && !somenteLeitura && caixaAberto && (
                  <button
                    onClick={() => setEstornar(p)}
                    aria-label="Estornar pagamento"
                    className="grid h-8 w-8 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-[#ff6b7f]"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editavel && (
        <div className="flex gap-2 border-t border-line p-4 lg:px-6">
          {comanda.pagamentos.every((p) => p.estornado) && (
            <Button variant="ghost" onClick={() => setCancelar(true)} aria-label="Cancelar comanda">
              <Ban className="h-4 w-4" /> <span className="hidden sm:inline">Cancelar</span>
            </Button>
          )}
          <Button size="lg" block disabled={!caixaAberto || t.restante <= 0} onClick={() => setPagar(true)}>
            {caixaAberto ? `Registrar pagamento · ${formatBRL(t.restante)}` : "Abra o caixa para receber"}
          </Button>
        </div>
      )}

      <PagamentoDialog comanda={comanda} open={pagar} onClose={() => setPagar(false)} />
      <EstornoDialog pagamento={estornar} onClose={() => setEstornar(null)} />
      <ConfirmDialog
        open={cancelar}
        onClose={() => setCancelar(false)}
        onConfirm={() => cancelarM.mutate()}
        loading={cancelarM.isPending}
        perigo
        titulo={`Cancelar comanda da mesa ${comanda.mesaNumero}?`}
        descricao="A mesa será liberada e a comanda não entra no faturamento. Use só para comandas abertas por engano."
        confirmar="Cancelar comanda"
      />
    </div>
  );
}

function Row({ l, v, className }: { l: string; v: number; className?: string }) {
  return (
    <div className={cn("flex justify-between text-muted", className)}>
      <dt>{l}</dt>
      <dd className="tabular-nums">{formatBRL(v)}</dd>
    </div>
  );
}
