"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Coroa } from "@/components/brand/coroa";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";

export interface ItemNav {
  href: string;
  label: string;
  icon: LucideIcon;
  /** sub-itens aparecem indentados */
  filhos?: { href: string; label: string }[];
  exato?: boolean;
}

/**
 * Shell com sidebar para Admin e Caixa.
 * - desktop: sidebar fixa (recolhível quando `recolhivel`)
 * - mobile: vira drawer
 */
export function PainelShell({
  nav,
  titulo,
  migalhas,
  extraHeader,
  recolhivel,
  children,
}: {
  nav: ItemNav[];
  titulo: string;
  migalhas: Record<string, string>;
  extraHeader?: ReactNode;
  recolhivel?: boolean;
  children: ReactNode;
}) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [recolhido, setRecolhido] = useState(false);

  useEffect(() => {
    setDrawer(false);
  }, [path]);

  const ativo = (href: string, exato?: boolean) => (exato ? path === href : path === href || path.startsWith(href + "/"));

  // breadcrumb: monta a partir dos segmentos conhecidos
  const segmentos = path.split("/").filter(Boolean);
  const trilha = segmentos
    .map((_, i) => "/" + segmentos.slice(0, i + 1).join("/"))
    .filter((href) => migalhas[href])
    .map((href) => ({ href, label: migalhas[href] }));

  const Lista = ({ mini }: { mini?: boolean }) => (
    <nav aria-label={titulo} className="space-y-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const on = ativo(item.href, item.exato) || !!item.filhos?.some((f) => ativo(f.href));
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              title={mini ? item.label : undefined}
              aria-current={on ? "page" : undefined}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                on ? "bg-red-soft text-cream" : "text-muted hover:bg-surface hover:text-cream",
                mini && "justify-center px-0",
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", on && "text-gold")} />
              {!mini && <span className="truncate">{item.label}</span>}
              {!mini && on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
            </Link>
            {!mini && item.filhos && (
              <div className="ml-6 mt-1 space-y-0.5 border-l border-line pl-3">
                {item.filhos.map((f) => (
                  <Link
                    key={f.href}
                    href={f.href}
                    aria-current={ativo(f.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm",
                      ativo(f.href) ? "text-gold" : "text-subtle hover:text-cream",
                    )}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* sidebar desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg-soft transition-[width] duration-200 lg:flex",
          recolhido ? "w-[76px]" : "w-64",
        )}
      >
        <div className={cn("flex h-20 items-center border-b border-line", recolhido ? "justify-center" : "px-6")}>
          {recolhido ? <Coroa className="h-5 w-7 text-gold" /> : <Logo compacto />}
          {!recolhido && <span className="ml-3 rounded-md bg-surface px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted">{titulo}</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Lista mini={recolhido} />
        </div>
        {recolhivel && (
          <button
            onClick={() => setRecolhido((v) => !v)}
            className="m-3 flex h-10 items-center justify-center gap-2 rounded-lg text-sm text-subtle hover:bg-surface hover:text-cream"
            aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          >
            {recolhido ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5" /> Recolher</>}
          </button>
        )}
      </aside>

      {/* drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-fade-in flex-col border-r border-line bg-bg-soft">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo compacto />
              <button onClick={() => setDrawer(false)} aria-label="Fechar menu" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <Lista />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:h-20 lg:px-8">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <ol className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Você está em">
            {trilha.map((m, i) => (
              <li key={m.href} className="flex min-w-0 items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />}
                {i === trilha.length - 1 ? (
                  <span className="truncate font-display text-xl text-cream lg:text-2xl">{m.label}</span>
                ) : (
                  <Link href={m.href} className="truncate text-muted hover:text-cream">
                    {m.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
          <div className="ml-auto flex items-center gap-3">
            {extraHeader}
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 animate-fade-in px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
