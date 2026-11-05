"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarMesasComStatus } from "@/services/mesas.service";
import { MesaCard } from "@/components/garcom/mesa-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { useNow } from "@/hooks/useNow";
import { STATUS_MESA_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { StatusMesa } from "@/types";

const FILTROS: (StatusMesa | "todas")[] = ["todas", "chamando", "aguardando_pagamento", "ocupada", "livre"];
const PONTO: Record<StatusMesa, string> = { livre: "bg-subtle", ocupada: "bg-ok", chamando: "bg-red", aguardando_pagamento: "bg-gold" };

export default function MesasPage() {
  const agora = useNow(30_000);
  const [filtro, setFiltro] = useState<StatusMesa | "todas">("todas");
  const q = useQuery({ queryKey: ["mesas-status"], queryFn: listarMesasComStatus });

  const mesas = (q.data ?? []).filter((m) => filtro === "todas" || m.status === filtro);
  const contar = (s: StatusMesa) => (q.data ?? []).filter((m) => m.status === s).length;

  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="font-display text-4xl">Mesas</h1>
        <p className="text-sm text-muted">{q.data ? `${q.data.length - contar("livre")} de ${q.data.length} ocupadas` : ""}</p>
      </div>

      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm",
              filtro === f ? "border-gold bg-gold text-bg font-semibold" : "border-line text-muted",
            )}
          >
            {f !== "todas" && <span className={cn("h-2 w-2 rounded-full", PONTO[f])} />}
            {f === "todas" ? "Todas" : STATUS_MESA_LABEL[f]}
            {f !== "todas" && contar(f) > 0 && <span className="tabular-nums opacity-70">{contar(f)}</span>}
          </button>
        ))}
      </div>

      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:gap-3">
        {q.isLoading && Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}
        {mesas.map((m) => (
          <MesaCard key={m.id} mesa={m} agora={agora} />
        ))}
      </div>
      {q.data && mesas.length === 0 && <p className="py-10 text-center text-sm text-subtle">Nenhuma mesa neste status.</p>}
    </div>
  );
}
