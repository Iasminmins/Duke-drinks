"use client";

import { Beer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarca } from "./marca";

/**
 * Temas personalizados: identidade visual feita sob medida para um cliente, ligada ao slug dele.
 * Quem não tem tema usa o visual padrão do Comandou (nome + cor da marca).
 * Bom para vender como adicional ("tema personalizado") para clientes maiores.
 */
export interface Tema {
  Logo: (p: { className?: string; compacto?: boolean }) => React.ReactElement;
  Mascote: (p: { className?: string }) => React.ReactElement;
  Coroa: (p: { className?: string }) => React.ReactElement;
  /** texto pequeno acima da mensagem do topo do cardápio */
  selo?: string;
}

// ---------------------------------------------------------------- Duke | Drinks e Choperia
function CoroaDuke({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 22" className={className} aria-hidden fill="currentColor">
      <path d="M2 6.5 9 12 16 2l7 10 7-5.5L27.5 19h-23L2 6.5Z" />
      <rect x="4" y="19.5" width="24" height="2.5" rx="1" />
    </svg>
  );
}

export function LogoDuke({ className, compacto }: { className?: string; compacto?: boolean }) {
  return (
    <div className={cn("inline-flex flex-col items-center leading-none", className)} aria-label="Duke Drinks e Choperia">
      <CoroaDuke className={cn("text-[#f5b800]", compacto ? "h-2.5 w-4" : "h-3.5 w-6")} />
      <span className={cn("font-display text-[#f5ecd7]", compacto ? "text-2xl" : "text-[34px]")}>DUKE</span>
      {!compacto && (
        <span className="mt-0.5 flex items-center gap-1.5 text-[8px] font-semibold tracking-[0.3em] text-[#a8a196]">
          <span className="h-px w-3 bg-[#f5b800]/60" />
          DRINKS & CHOPERIA
          <span className="h-px w-3 bg-[#f5b800]/60" />
        </span>
      )}
    </div>
  );
}

function MascoteDuke({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative grid place-items-center rounded-full border-2 border-[#c8102e] bg-[radial-gradient(circle_at_30%_25%,#c8102e,#5c0715)] shadow-[0_0_40px_#c8102e40]",
        className,
      )}
    >
      <CoroaDuke className="absolute -top-[14%] h-[26%] w-[40%] text-[#f5b800] drop-shadow" />
      <Beer className="h-[46%] w-[46%] text-[#f5b800]" strokeWidth={1.6} />
    </div>
  );
}

export const TEMAS: Record<string, Tema> = {
  duke: { Logo: LogoDuke, Mascote: MascoteDuke, Coroa: CoroaDuke, selo: "Powered by Brahma" },
};

/** tema do negócio acessado, se ele tiver um */
export function useTema(): Tema | undefined {
  const marca = useMarca();
  return marca ? TEMAS[marca.slug] : undefined;
}
