"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt, Search } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { SkeletonLista } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ComandaDetalhe } from "@/components/caixa/comanda-detalhe";
import { listarComandas } from "@/services/comandas.service";
import { getCaixaAberto } from "@/services/caixa.service";
import { getEstabelecimento } from "@/services/config.service";
import { formatBRL, tempoDesde } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filtro = "todas" | "aguardando_pagamento" | "aberta";

export default function CaixaComandas() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["comandas-caixa"], queryFn: () => listarComandas(["aberta", "aguardando_pagamento", "fechada"]) });
  const caixaQ = useQuery({ queryKey: ["caixa-aberto"], queryFn: getCaixaAberto });
  const estQ = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });

  // comandas fechadas só ficam na lista enquanto estão selecionadas (para ver o resultado da baixa)
  const ativas = (q.data ?? []).filter((c) => c.status !== "fechada" || c.id === selecionada);
  const lista = ativas
    .filter((c) => filtro === "todas" || c.status === filtro)
    .filter((c) => {
      const q = busca.trim().toLowerCase();
      return !q || String(c.mesaNumero).startsWith(q) || (c.clienteNome ?? "").toLowerCase().includes(q);
    });
  const atual = q.data?.find((c) => c.id === selecionada);
  const aguardando = ativas.filter((c) => c.status === "aguardando_pagamento").length;

  // seleciona a primeira automaticamente no desktop
  useEffect(() => {
    if (!selecionada && lista.length && window.matchMedia("(min-width: 1024px)").matches) setSelecionada(lista[0].id);
  }, [lista, selecionada]);

  return (
    <div className="-mx-4 -my-6 lg:-mx-8">
      {caixaQ.data === null && (
        <div className="flex flex-wrap items-center gap-3 border-b border-red/40 bg-red-soft px-4 py-3 text-sm lg:px-8">
          <span className="flex-1">O caixa está fechado. Abra o caixa para registrar pagamentos.</span>
          <Link href="/caixa/dia" className="rounded-lg bg-red px-3 py-1.5 font-semibold text-cream">Abrir caixa</Link>
        </div>
      )}
      <div className="flex h-[calc(100dvh-64px)] lg:h-[calc(100dvh-80px)]">
        {/* lista */}
        <aside className={cn("flex w-full shrink-0 flex-col border-r border-line lg:w-[360px]", selecionada && "hidden lg:flex")}>
          <div className="space-y-3 border-b border-line p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                inputMode="numeric"
                placeholder="Buscar mesa"
                aria-label="Buscar por número da mesa"
                value={busca}
                onChange={(e) => setBusca(e.target.value.replace(/\D/g, ""))}
                className="h-11 w-full rounded-[10px] border border-line bg-bg-soft pl-9 pr-3 text-sm focus:border-gold focus:outline-none"
              />
            </div>
            <Tabs
              valor={filtro}
              onChange={setFiltro}
              className="w-full [&>button]:flex-1 [&>button]:justify-center"
              opcoes={[
                { valor: "todas", label: "Todas" },
                { valor: "aguardando_pagamento", label: "Conta", contador: aguardando },
                { valor: "aberta", label: "Abertas" },
              ]}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {q.isLoading && <SkeletonLista linhas={5} className="p-2" />}
            {q.isError && <ErrorState onRetry={() => q.refetch()} />}
            {q.data && lista.length === 0 && <EmptyState compacto titulo="Nenhuma comanda" descricao="Nada neste filtro agora." />}
            <ul className="space-y-1">
              {lista.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelecionada(c.id)}
                    aria-current={selecionada === c.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                      selecionada === c.id ? "bg-surface-2 ring-1 ring-gold/50" : "hover:bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-lg font-display text-2xl",
                        c.status === "aguardando_pagamento" ? "bg-gold text-bg" : "bg-surface-2",
                      )}
                    >
                      {c.mesaNumero}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Mesa {c.mesaNumero}{c.clienteNome ? ` · ${c.clienteNome}` : ""}</span>
                      <span className="block text-xs text-subtle">há {tempoDesde(c.abertaEm)} · {c.pedidos.length} pedido(s)</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums">{formatBRL(c.totais.total)}</span>
                      {c.status === "aguardando_pagamento" ? (
                        <Receipt className="ml-auto mt-0.5 h-4 w-4 text-gold" />
                      ) : c.status === "fechada" ? (
                        <StatusBadge tipo="comanda" status="fechada" />
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* detalhe */}
        <section className={cn("min-w-0 flex-1 flex-col", selecionada ? "flex" : "hidden lg:flex")}>
          {atual ? (
            <>
              <button onClick={() => setSelecionada(null)} className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm text-muted lg:hidden">
                <ArrowLeft className="h-4 w-4" /> Comandas
              </button>
              <div className="min-h-0 flex-1">
                <ComandaDetalhe comanda={atual} taxaPercent={estQ.data?.taxaServicoPadrao ?? 10} caixaAberto={!!caixaQ.data} />
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center">
              <EmptyState titulo="Selecione uma comanda" descricao="As mesas que pediram a conta aparecem primeiro." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
