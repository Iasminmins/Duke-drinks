"use client";
/* eslint-disable @next/next/no-img-element */
import { Beer, Coffee, Pizza, Sandwich, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarca } from "./marca";

const ICONE: Record<string, typeof Beer> = {
  bar: Beer,
  hamburgueria: Sandwich,
  lanchonete: Sandwich,
  pizzaria: Pizza,
  cafeteria: Coffee,
};

/** ilustração dos estados vazios: logo do negócio, ou um ícone que combina com o tipo dele */
export function Mascote({ className }: { className?: string }) {
  const marca = useMarca();
  if (marca?.logoUrl) return <img src={marca.logoUrl} alt="" className={cn("object-contain", className)} />;
  const Icone = ICONE[marca?.tipo ?? ""] ?? UtensilsCrossed;
  return (
    <div
      aria-hidden
      className={cn(
        "relative grid place-items-center rounded-full border-2 border-gold/60 bg-[radial-gradient(circle_at_30%_25%,var(--color-surface-2),var(--color-bg))]",
        className,
      )}
    >
      <Icone className="h-[46%] w-[46%] text-gold" strokeWidth={1.6} />
    </div>
  );
}
