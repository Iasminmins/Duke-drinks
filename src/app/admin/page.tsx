"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardCheck, ClipboardList, Receipt, TrendingUp, type LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { getResumoDashboard } from "@/services/relatorios.service";
import { FORMA_LABEL } from "@/lib/labels";
import { formatBRL } from "@/lib/format";

export default function Dashboard() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: getResumoDashboard });

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const d = q.data;
  const maxVendido = Math.max(1, ...(d?.maisVendidos.map((m) => m.quantidade) ?? [1]));
  const totalForma = d?.porForma.reduce((s, f) => s + f.total, 0) || 1;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Indicadores das últimas 24 horas (cobre o expediente que vira a meia-noite).</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={TrendingUp} label="Faturamento" valor={d && formatBRL(d.faturamentoDia)} destaque />
        <Kpi icon={Receipt} label="Ticket médio" valor={d && formatBRL(d.ticketMedio)} />
        <Kpi icon={ClipboardCheck} label="Comandas fechadas" valor={d && String(d.comandasFechadas)} />
        <Kpi icon={ClipboardList} label="Mesas em uso agora" valor={d && String(d.comandasAbertas)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Faturamento por horário</CardTitle></CardHeader>
          <div className="h-72 p-4">
            {!d ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.porHora} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="#36363b" strokeDasharray="3 3" />
                  <XAxis dataKey="hora" tick={{ fill: "#a8a196", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#a8a196", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "#f5b80014" }}
                    contentStyle={{ background: "#1a1a1c", border: "1px solid #36363b", borderRadius: 10, color: "#f5ecd7" }}
                    formatter={(v) => [formatBRL(Number(v)), "Faturamento"]}
                  />
                  <Bar dataKey="total" fill="#f5b800" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Por forma de pagamento</CardTitle></CardHeader>
          <div className="space-y-4 p-4">
            {!d && <Skeleton className="h-40 w-full" />}
            {d?.porForma.length === 0 && <p className="text-sm text-subtle">Sem pagamentos no período.</p>}
            {d?.porForma.map((f) => (
              <div key={f.forma}>
                <div className="flex justify-between text-sm">
                  <span>{FORMA_LABEL[f.forma]}</span>
                  <span className="tabular-nums text-muted">{formatBRL(f.total)} · {Math.round((f.total / totalForma) * 100)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-red" style={{ width: `${(f.total / totalForma) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Mais vendidos</CardTitle></CardHeader>
        {!d ? (
          <div className="p-4"><Skeleton className="h-48 w-full" /></div>
        ) : d.maisVendidos.length === 0 ? (
          <EmptyState compacto titulo="Sem vendas ainda" />
        ) : (
          <ol className="divide-y divide-line">
            {d.maisVendidos.map((m, i) => (
              <li key={m.nome} className="flex items-center gap-4 px-4 py-3">
                <span className="w-6 font-display text-2xl text-gold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.nome}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${(m.quantidade / maxVendido) * 100}%` }} />
                  </div>
                </div>
                <span className="w-16 text-right text-sm tabular-nums text-muted">{m.quantidade} un.</span>
                <span className="w-24 text-right text-sm font-semibold tabular-nums">{formatBRL(m.total)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, valor, destaque }: { icon: LucideIcon; label: string; valor?: string; destaque?: boolean }) {
  return (
    <Card className={destaque ? "border-gold/50 p-5" : "p-5"}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-subtle">{label}</p>
        <Icon className={destaque ? "h-5 w-5 text-gold" : "h-5 w-5 text-muted"} />
      </div>
      {valor ? <p className={destaque ? "mt-2 font-display text-4xl text-gold" : "mt-2 font-display text-4xl"}>{valor}</p> : <Skeleton className="mt-3 h-9 w-32" />}
    </Card>
  );
}
