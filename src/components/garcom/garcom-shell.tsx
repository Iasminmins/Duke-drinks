"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, CheckCheck, LayoutGrid, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { notificacoesGarcom } from "@/services/pedidos.service";
import { useSession } from "@/stores/session";
import { tocarAlerta } from "@/lib/som";
import { cn } from "@/lib/utils";

export function GarcomShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const usuario = useSession((s) => s.usuario);
  const notifQ = useQuery({ queryKey: ["notificacoes"], queryFn: notificacoesGarcom });
  const n = notifQ.data ?? [];
  const prontos = n.filter((x) => x.tipo === "pronto").length;
  const chamados = n.filter((x) => x.tipo !== "pronto").length;

  // avisa (som + toast) quando aparece um chamado ou pedido de conta novo
  const vistos = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!notifQ.data) return;
    const alertas = notifQ.data.filter((x) => x.tipo !== "pronto");
    if (vistos.current) {
      const novos = alertas.filter((x) => !vistos.current!.has(x.id));
      if (novos.length) {
        tocarAlerta();
        toast(novos[0].tipo === "chamado" ? "🔔 Uma mesa está chamando" : "🧾 Uma mesa pediu a conta", {
          action: { label: "Ver", onClick: () => (window.location.href = "/garcom/chamados") },
        });
      }
    }
    vistos.current = new Set(alertas.map((x) => x.id));
  }, [notifQ.data]);

  const itens = [
    { href: "/garcom", label: "Mesas", icon: LayoutGrid, exato: true },
    { href: "/garcom/prontos", label: "Prontos", icon: CheckCheck, badge: prontos },
    { href: "/garcom/chamados", label: "Chamados", icon: BellRing, badge: chamados, alerta: true },
    { href: "/garcom/perfil", label: "Perfil", icon: UserRound },
  ];
  const ativo = (href: string, exato?: boolean) =>
    exato ? path === href || path.startsWith("/garcom/mesa") : path.startsWith(href);

  return (
    <div className="min-h-dvh bg-bg pb-[calc(72px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/95 px-4 backdrop-blur">
        <Logo compacto />
        <span className="text-sm text-muted">Olá, <b className="text-cream">{usuario?.nome.split(" ")[0]}</b></span>
      </header>
      <main className="mx-auto max-w-3xl animate-fade-in px-4 py-5">{children}</main>
      <nav
        aria-label="Navegação do garçom"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-soft/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {itens.map(({ href, label, icon: Icon, badge, alerta, exato }) => {
            const on = ativo(href, exato);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn("relative flex h-[72px] flex-col items-center justify-center gap-1 text-[11px] font-medium", on ? "text-gold" : "text-muted")}
                >
                  <span className="relative">
                    <Icon className="h-6 w-6" />
                    {!!badge && (
                      <span
                        className={cn(
                          "absolute -right-2.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold",
                          alerta ? "animate-pulse bg-red text-cream" : "bg-gold text-bg",
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                  {label}
                  {on && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-gold" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
