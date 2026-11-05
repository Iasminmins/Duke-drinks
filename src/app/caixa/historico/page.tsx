"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { SkeletonLista } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ComandaDetalhe } from "@/components/caixa/comanda-detalhe";
import { historicoComandas, type FiltroHistorico } from "@/services/comandas.service";
import { listarUsuarios } from "@/services/usuarios.service";
import { getEstabelecimento } from "@/services/config.service";
import { FORMA_LABEL, FORMAS } from "@/lib/labels";
import { formatBRL, formatDataHora } from "@/lib/format";

const hojeISO = () => new Date().toISOString().slice(0, 10);
const diasAtras = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function HistoricoPage() {
  const [f, setF] = useState<FiltroHistorico>({ de: diasAtras(7), ate: hojeISO() });
  const [aberta, setAberta] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["historico", f], queryFn: () => historicoComandas(f) });
  const usuariosQ = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });
  const estQ = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });
  const nome = (id?: string) => usuariosQ.data?.find((u) => u.id === id)?.nome ?? "—";

  const total = useMemo(() => (q.data ?? []).filter((c) => c.status === "fechada").reduce((s, c) => s + c.totais.pago, 0), [q.data]);
  const atual = q.data?.find((c) => c.id === aberta);

  return (
    <div className="space-y-5">
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-muted">
          De
          <Input type="date" value={f.de ?? ""} onChange={(e) => setF({ ...f, de: e.target.value })} className="mt-1" />
        </label>
        <label className="text-xs text-muted">
          Até
          <Input type="date" value={f.ate ?? ""} onChange={(e) => setF({ ...f, ate: e.target.value })} className="mt-1" />
        </label>
        <label className="text-xs text-muted">
          Forma de pagamento
          <Select value={f.forma ?? ""} onChange={(e) => setF({ ...f, forma: e.target.value || undefined })} className="mt-1">
            <option value="">Todas</option>
            {FORMAS.map((x) => <option key={x} value={x}>{FORMA_LABEL[x]}</option>)}
          </Select>
        </label>
        <label className="text-xs text-muted">
          Operador
          <Select value={f.operadorId ?? ""} onChange={(e) => setF({ ...f, operadorId: e.target.value || undefined })} className="mt-1">
            <option value="">Todos</option>
            {usuariosQ.data?.filter((u) => u.papel === "caixa" || u.papel === "admin").map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </Select>
        </label>
        <div className="flex flex-col justify-end rounded-lg bg-bg-soft px-3 py-2">
          <span className="text-xs text-subtle">{q.data?.length ?? 0} comanda(s)</span>
          <span className="font-display text-2xl text-gold">{formatBRL(total)}</span>
        </div>
      </Card>

      {q.isLoading && <SkeletonLista />}
      {q.data && q.data.length === 0 && <EmptyState titulo="Nada no período" descricao="Ajuste os filtros para ver outras comandas." />}

      {q.data && q.data.length > 0 && (
        <>
          {/* desktop: tabela */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-subtle">
                  <th className="px-4 py-3 font-medium">Mesa</th>
                  <th className="px-4 py-3 font-medium">Abertura</th>
                  <th className="px-4 py-3 font-medium">Fechamento</th>
                  <th className="px-4 py-3 font-medium">Pagamentos</th>
                  <th className="px-4 py-3 font-medium">Operador</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((c) => (
                  <tr key={c.id} onClick={() => setAberta(c.id)} className="cursor-pointer hover:bg-surface-2">
                    <td className="px-4 py-3 font-display text-2xl text-gold">{c.mesaNumero}{c.clienteNome && <span className="block font-sans text-xs font-normal text-muted">{c.clienteNome}</span>}</td>
                    <td className="px-4 py-3 text-muted">{formatDataHora(c.abertaEm)}</td>
                    <td className="px-4 py-3 text-muted">{c.fechadaEm ? formatDataHora(c.fechadaEm) : "—"}</td>
                    <td className="px-4 py-3">
                      {[...new Set(c.pagamentos.filter((p) => !p.estornado).map((p) => FORMA_LABEL[p.forma]))].join(" + ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{nome(c.fechadaPor)}</td>
                    <td className="px-4 py-3"><StatusBadge tipo="comanda" status={c.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatBRL(c.totais.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* mobile: cards */}
          <ul className="space-y-2 md:hidden">
            {q.data.map((c) => (
              <li key={c.id}>
                <button onClick={() => setAberta(c.id)} className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left">
                  <span className="font-display text-3xl text-gold">{c.mesaNumero}</span>
                  <span className="flex-1 text-xs text-muted">
                    {c.fechadaEm ? formatDataHora(c.fechadaEm) : "—"} · {nome(c.fechadaPor)}
                  </span>
                  <span className="font-semibold tabular-nums">{formatBRL(c.totais.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={!!atual} onClose={() => setAberta(null)} titulo={`Comanda · Mesa ${atual?.mesaNumero ?? ""}`} largura="xl" esconderTitulo>
        {atual && (
          <div className="-mx-5 -mb-5">
            <ComandaDetalhe comanda={atual} taxaPercent={estQ.data?.taxaServicoPadrao ?? 10} caixaAberto={false} somenteLeitura />
          </div>
        )}
      </Dialog>
    </div>
  );
}
