"use client";
/* eslint-disable @next/next/no-img-element */
import { PRODUTO } from "@/lib/planos";
import { cn } from "@/lib/utils";
import { Coroa } from "./coroa";
import { useMarca } from "./marca";

/** logo do negócio (imagem enviada no admin) ou o nome dele; no site do produto, o nome do produto */
export function Logo({ className, compacto }: { className?: string; compacto?: boolean }) {
  const marca = useMarca();
  const nome = marca?.nome ?? PRODUTO.nome;
  if (marca?.logoUrl) {
    return <img src={marca.logoUrl} alt={nome} className={cn(compacto ? "h-8" : "h-12", "w-auto max-w-[180px] object-contain", className)} />;
  }
  // nome curto em destaque (antes do "|" ou "-"), resto como subtítulo
  const [principal, ...resto] = nome.split(/\s*[|·–-]\s*/);
  const sub = resto.join(" · ");
  return (
    <div className={cn("inline-flex flex-col items-center leading-none", className)} aria-label={nome}>
      <Coroa className={cn("text-gold", compacto ? "h-2.5 w-4" : "h-3.5 w-6")} />
      <span className={cn("max-w-[220px] truncate font-display uppercase text-cream", compacto ? "text-2xl" : "text-[34px]")}>
        {principal}
      </span>
      {!compacto && sub && (
        <span className="mt-0.5 flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.3em] text-muted">
          <span className="h-px w-3 bg-gold/60" />
          {sub}
          <span className="h-px w-3 bg-gold/60" />
        </span>
      )}
    </div>
  );
}
