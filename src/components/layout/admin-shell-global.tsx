"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AvisoAssinatura } from "@/components/layout/aviso-assinatura";
import { ADMIN_MIGALHAS, ADMIN_NAV } from "@/components/layout/admin-navigation";
import { PainelShell } from "@/components/layout/painel-shell";
import { getCaixaAberto } from "@/services/caixa.service";
import { useSession } from "@/stores/session";

function StatusCaixa() {
  const q = useQuery({ queryKey: ["caixa-aberto"], queryFn: getCaixaAberto });
  if (q.isLoading) return null;
  return q.data ? <Badge tom="ok">● Caixa aberto</Badge> : <Badge tom="red">● Caixa fechado</Badge>;
}

function HeaderAdmin({ mostrarStatusCaixa }: { mostrarStatusCaixa: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <AvisoAssinatura />
      {mostrarStatusCaixa && <StatusCaixa />}
    </div>
  );
}

export function AdminShellGlobal({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const usuario = useSession((s) => s.usuario);
  const emAreaAdministrativa = ["/admin", "/caixa", "/garcom", "/kds", "/assinatura"].some(
    (prefixo) => path === prefixo || path.startsWith(`${prefixo}/`),
  );

  if (usuario?.papel !== "admin" || !emAreaAdministrativa) return <>{children}</>;

  const emAreaDoCaixa = path === "/caixa" || path.startsWith("/caixa/");
  return (
    <PainelShell
      nav={ADMIN_NAV}
      titulo="Admin"
      migalhas={ADMIN_MIGALHAS}
      recolhivel={emAreaDoCaixa}
      extraHeader={<HeaderAdmin mostrarStatusCaixa={emAreaDoCaixa} />}
    >
      {children}
    </PainelShell>
  );
}
