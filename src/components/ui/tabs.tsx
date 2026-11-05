"use client";

import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  valor,
  onChange,
  opcoes,
  className,
}: {
  valor: T;
  onChange: (v: T) => void;
  opcoes: { valor: T; label: string; contador?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-xl border border-line bg-bg-soft p-1", className)}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          role="tab"
          aria-selected={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
            valor === o.valor ? "bg-surface-2 text-cream" : "text-muted hover:text-cream",
          )}
        >
          {o.label}
          {o.contador !== undefined && o.contador > 0 && (
            <span className="rounded-full bg-gold px-1.5 text-[11px] font-bold text-bg">{o.contador}</span>
          )}
        </button>
      ))}
    </div>
  );
}
