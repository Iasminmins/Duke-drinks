"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAssinatura } from "@/services/plataforma.service";
import { cn } from "@/lib/utils";

/** selo no topo do admin: dias de teste restantes ou assinatura perto de vencer */
export function AvisoAssinatura() {
  const q = useQuery({ queryKey: ["assinatura"], queryFn: getAssinatura, staleTime: 5 * 60_000 });
  const a = q.data;
  if (!a) return null;
  const dias = a.diasRestantes;
  let texto: string | null = null;
  let alerta = false;
  if (!a.liberado) {
    texto = "Assinatura bloqueada";
    alerta = true;
  } else if (a.status === "trial" && dias !== null) {
    texto = dias <= 1 ? "Teste termina hoje" : `Teste: ${dias} dias`;
    alerta = dias <= 3;
  } else if (a.status === "ativo" && dias !== null && dias <= 5) {
    texto = dias < 0 ? "Assinatura vencida" : `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
    alerta = true;
  }
  if (!texto) return null;
  return (
    <Link
      href="/assinatura"
      className={cn(
        "hidden h-9 items-center rounded-full border px-3 text-xs font-semibold sm:inline-flex",
        alerta ? "border-red/60 bg-red-soft text-cream" : "border-gold/50 bg-gold-soft text-gold",
      )}
    >
      {texto}
    </Link>
  );
}
