import Link from "next/link";
import { BellRing, Receipt, Users } from "lucide-react";
import { formatBRL, tempoDesde } from "@/lib/format";
import { STATUS_MESA_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { MesaComStatus } from "@/types";

const estilo = {
  livre: "border-line bg-surface text-muted",
  ocupada: "border-ok/50 bg-ok-soft text-cream",
  chamando: "border-red bg-red-soft text-cream animate-pulse",
  aguardando_pagamento: "border-gold bg-gold-soft text-cream",
} as const;

export function MesaCard({ mesa, agora }: { mesa: MesaComStatus; agora: number }) {
  return (
    <Link
      href={`/garcom/mesa/${mesa.numero}`}
      aria-label={`Mesa ${mesa.numero}, ${STATUS_MESA_LABEL[mesa.status]}`}
      className={cn("relative flex aspect-square flex-col rounded-card border-2 p-2.5 transition-transform active:scale-95", estilo[mesa.status])}
    >
      <div className="flex items-start justify-between">
        <span className="font-display text-4xl leading-none">{mesa.numero}</span>
        {mesa.status === "chamando" && <BellRing className="h-5 w-5 text-[#ff6b7f]" />}
        {mesa.status === "aguardando_pagamento" && <Receipt className="h-5 w-5 text-gold" />}
      </div>
      <div className="mt-auto space-y-0.5 text-[11px] leading-tight">
        {mesa.comanda ? (
          <>
            <p className="font-semibold tabular-nums text-cream">{formatBRL(mesa.totalParcial ?? 0)}</p>
            <p className="text-muted">
              {tempoDesde(mesa.comanda.abertaEm, agora)}
              {mesa.comandas.length > 1 && ` · ${mesa.comandas.length} comandas`}
            </p>
          </>
        ) : (
          <p className="flex items-center gap-1"><Users className="h-3 w-3" /> {mesa.lugares} lugares</p>
        )}
      </div>
    </Link>
  );
}
