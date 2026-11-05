"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
  /** "center" = modal; "bottom" = bottom sheet no mobile (modal no desktop); "right" = drawer */
  variante?: "center" | "bottom" | "right";
  largura?: "sm" | "md" | "lg" | "xl";
  esconderTitulo?: boolean;
}

const larguras = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg", xl: "sm:max-w-2xl" };

export function Dialog({
  open,
  onClose,
  titulo,
  descricao,
  children,
  rodape,
  variante = "center",
  largura = "md",
  esconderTitulo,
}: DialogProps) {
  const id = useId();
  const painel = useRef<HTMLDivElement>(null);
  const fecharRef = useRef(onClose);
  fecharRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focaveis = () =>
      painel.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
    // foco inicial no primeiro campo (ou no painel)
    requestAnimationFrame(() => {
      const els = focaveis();
      const primeiro = Array.from(els ?? []).find((e) => e.dataset.fechar === undefined);
      (primeiro ?? painel.current)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharRef.current();
      if (e.key === "Tab") {
        const els = Array.from(focaveis() ?? []);
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const posicao = {
    center: "items-end sm:items-center justify-center p-0 sm:p-4",
    bottom: "items-end sm:items-center justify-center sm:p-4",
    right: "items-stretch justify-end",
  }[variante];

  const caixa = {
    center: cn("w-full rounded-t-2xl sm:rounded-2xl max-h-[92dvh]", larguras[largura]),
    bottom: cn("w-full rounded-t-2xl sm:rounded-2xl max-h-[92dvh]", larguras[largura]),
    right: "h-full w-full sm:max-w-md",
  }[variante];

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex animate-fade-in", posicao)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={descricao ? `${id}-d` : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex animate-slide-up flex-col border border-line bg-bg-soft shadow-2xl outline-none",
          caixa,
        )}
      >
        <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", esconderTitulo && "absolute right-0 top-0 z-10 p-3")}>
          <div className={cn(esconderTitulo && "sr-only")}>
            <h2 id={`${id}-t`} className="font-display text-2xl leading-tight text-cream">
              {titulo}
            </h2>
            {descricao && (
              <p id={`${id}-d`} className="mt-1 text-sm text-muted">
                {descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            data-fechar
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface/90 text-muted hover:text-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn("flex-1 overflow-y-auto px-5 pb-5", !esconderTitulo && "pt-4")}>{children}</div>
        {rodape && <div className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}
