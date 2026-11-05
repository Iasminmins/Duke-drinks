"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Categoria, Produto } from "@/types";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/ui/empty-state";

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Cardápio navegável: busca + abas de categoria sticky com scroll-spy.
 * Usado pelo cliente (QR) e pelo garçom ao lançar pedido.
 */
export function CardapioLista({
  categorias,
  produtos,
  onSelecionar,
  topoSticky = 64,
}: {
  categorias: Categoria[];
  produtos: Produto[];
  onSelecionar: (p: Produto) => void;
  /** altura do header fixo acima das abas (px) */
  topoSticky?: number;
}) {
  const [busca, setBusca] = useState("");
  const [ativa, setAtiva] = useState<string | undefined>(categorias[0]?.id);
  const secoes = useRef<Record<string, HTMLElement | null>>({});
  const abas = useRef<HTMLDivElement>(null);
  const clicando = useRef(false);

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return produtos;
    return produtos.filter((p) => normalizar(`${p.nome} ${p.descricao}`).includes(q));
  }, [busca, produtos]);

  const grupos = categorias
    .map((c) => ({
      categoria: c,
      // esgotados vão para o fim da lista
      itens: filtrados.filter((p) => p.categoriaId === c.id).sort((a, b) => Number(a.esgotado) - Number(b.esgotado)),
    }))
    .filter((g) => g.itens.length > 0);

  // scroll-spy
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (clicando.current) return;
        const visivel = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setAtiva(visivel.target.getAttribute("data-cat") ?? undefined);
      },
      { rootMargin: `-${topoSticky + 60}px 0px -60% 0px` },
    );
    Object.values(secoes.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [grupos.length, topoSticky]);

  // mantém a aba ativa visível na barra
  useEffect(() => {
    abas.current?.querySelector<HTMLElement>(`[data-tab="${ativa}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [ativa]);

  const irPara = (id: string) => {
    const el = secoes.current[id];
    if (!el) return;
    clicando.current = true;
    setAtiva(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topoSticky - 56, behavior: "smooth" });
    setTimeout(() => (clicando.current = false), 600);
  };

  return (
    <div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-sm text-cream placeholder:text-subtle focus:border-gold focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {busca && (
            <button onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-cream">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!busca && (
        <div className="sticky z-20 border-b border-line bg-bg/95 backdrop-blur after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-bg after:to-transparent" style={{ top: topoSticky }}>
          <div ref={abas} role="tablist" aria-label="Categorias" className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2.5 pr-10">
            {grupos.map(({ categoria }) => (
              <button
                key={categoria.id}
                data-tab={categoria.id}
                role="tab"
                aria-selected={ativa === categoria.id}
                onClick={() => irPara(categoria.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                  ativa === categoria.id ? "bg-gold text-bg" : "bg-surface text-muted hover:text-cream",
                )}
              >
                {categoria.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-7 px-4 pb-32 pt-4">
        {grupos.length === 0 && (
          <EmptyState compacto titulo="Nada por aqui" descricao={`Não achamos “${busca}”. Tente outro nome.`} />
        )}
        {grupos.map(({ categoria, itens }) => (
          <section
            key={categoria.id}
            data-cat={categoria.id}
            ref={(el) => {
              secoes.current[categoria.id] = el;
            }}
            aria-labelledby={`cat-${categoria.id}`}
          >
            <h2 id={`cat-${categoria.id}`} className="mb-3 flex items-center gap-3 font-display text-[26px] leading-none text-cream">
              {categoria.nome}
              <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
            </h2>
            <div className="space-y-2.5">
              {itens.map((p) => (
                <ProductCard key={p.id} produto={p} onClick={() => onSelecionar(p)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
