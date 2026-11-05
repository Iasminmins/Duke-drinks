"use client";

import { Plus } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Produto } from "@/types";
import { ProdutoImagem } from "./produto-imagem";

export function ProductCard({ produto, onClick }: { produto: Produto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={produto.esgotado}
      aria-label={`${produto.nome}, ${formatBRL(produto.preco)}${produto.esgotado ? ", esgotado" : ""}`}
      className={cn(
        "group flex w-full items-stretch gap-3 rounded-card border border-line bg-surface p-2.5 text-left transition-colors hover:border-gold/40 active:bg-surface-2",
        produto.esgotado && "opacity-55",
      )}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
        <ProdutoImagem produto={produto} className="h-full w-full" />
        {produto.esgotado && (
          <span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-cream">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start gap-2">
          <h3 className="font-semibold leading-snug text-cream">{produto.nome}</h3>
          {produto.destaque && !produto.esgotado && (
            <span className="mt-0.5 shrink-0 rounded bg-red px-1.5 py-px text-[10px] font-bold uppercase text-cream">Top</span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{produto.descricao}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display text-xl text-gold">{formatBRL(produto.preco)}</span>
          {!produto.esgotado && (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gold text-bg transition-transform group-active:scale-90">
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
