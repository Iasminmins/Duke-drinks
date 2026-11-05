import type { ReactNode } from "react";
import { Mascote } from "@/components/brand/mascote";
import { cn } from "@/lib/utils";

export function EmptyState({
  titulo,
  descricao,
  acao,
  className,
  compacto,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
  compacto?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compacto ? "py-8" : "py-14", className)}>
      <Mascote className={compacto ? "h-16 w-16" : "h-24 w-24"} />
      <h3 className="mt-4 font-display text-2xl text-cream">{titulo}</h3>
      {descricao && <p className="mt-1 max-w-xs text-sm text-muted">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

export function ErrorState({ mensagem, onRetry }: { mensagem?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-red-soft text-2xl">!</div>
      <h3 className="mt-3 font-display text-2xl">Não deu para carregar</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{mensagem ?? "Verifique a conexão e tente de novo."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
