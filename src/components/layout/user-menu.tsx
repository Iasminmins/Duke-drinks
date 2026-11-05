"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useSession } from "@/stores/session";
import { PAPEL_LABEL } from "@/lib/labels";

export function UserMenu() {
  const { usuario, sair } = useSession();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  if (!usuario) return null;
  // só letras: "Ias (Admin)" vira "IA", "Léo (Bar)" vira "LB"
  const iniciais = usuario.nome
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-3 hover:bg-surface-2"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-red text-xs font-bold text-cream">{iniciais}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">{usuario.nome}</span>
          <span className="block text-[11px] text-muted">{PAPEL_LABEL[usuario.papel]}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-56 animate-fade-in rounded-xl border border-line bg-bg-soft p-1 shadow-2xl">
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[#ff6b7f] hover:bg-surface"
            onClick={() => {
              sair();
              router.replace("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
