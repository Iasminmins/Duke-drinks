/* eslint-disable @next/next/no-img-element */
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Coroa } from "./coroa";

export function Logo({ className, compacto }: { className?: string; compacto?: boolean }) {
  if (BRAND.logo) return <img src={BRAND.logo} alt="Duke Drinks e Choperia" className={cn("h-10 w-auto", className)} />;
  return (
    <div className={cn("inline-flex flex-col items-center leading-none", className)} aria-label="Duke Drinks e Choperia">
      <Coroa className={cn("text-gold", compacto ? "h-2.5 w-4" : "h-3.5 w-6")} />
      <span className={cn("font-display text-cream", compacto ? "text-2xl" : "text-[34px]")}>DUKE</span>
      {!compacto && (
        <span className="mt-0.5 flex items-center gap-1.5 text-[8px] font-semibold tracking-[0.3em] text-muted">
          <span className="h-px w-3 bg-gold/60" />
          DRINKS & CHOPERIA
          <span className="h-px w-3 bg-gold/60" />
        </span>
      )}
    </div>
  );
}
