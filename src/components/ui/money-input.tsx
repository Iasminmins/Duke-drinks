"use client";

import { forwardRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Campo de dinheiro em pt-BR. Digita só números: "1250" vira "12,50".
 * Emite o valor numérico em reais.
 */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  {
    value: number;
    onChange: (v: number) => void;
    id?: string;
    className?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    "aria-label"?: string;
    "aria-invalid"?: boolean;
  }
>(function MoneyInput({ value, onChange, className, ...props }, ref) {
  const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [texto, setTexto] = useState(fmt(value));

  useEffect(() => {
    setTexto(fmt(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">R$</span>
      <input
        ref={ref}
        inputMode="numeric"
        className="h-11 w-full rounded-[10px] border border-line bg-bg-soft pl-10 pr-3 text-right font-mono text-base tabular-nums text-cream focus:border-gold focus:outline-none aria-[invalid=true]:border-red"
        value={texto}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, "").slice(0, 9);
          const n = Number(digitos || "0") / 100;
          setTexto(fmt(n));
          onChange(n);
        }}
        {...props}
      />
    </div>
  );
});
