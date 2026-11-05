"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, History, Wallet } from "lucide-react";
import { RoleGuard } from "@/components/layout/role-guard";
import { PainelShell, type ItemNav } from "@/components/layout/painel-shell";
import { Badge } from "@/components/ui/badge";
import { getCaixaAberto } from "@/services/caixa.service";

const NAV: ItemNav[] = [
  { href: "/caixa", label: "Comandas", icon: ClipboardList, exato: true },
  { href: "/caixa/dia", label: "Caixa do dia", icon: Wallet },
  { href: "/caixa/historico", label: "Histórico", icon: History },
];
const MIGALHAS = { "/caixa": "Comandas", "/caixa/dia": "Caixa do dia", "/caixa/historico": "Histórico" };

function StatusCaixa() {
  const q = useQuery({ queryKey: ["caixa-aberto"], queryFn: getCaixaAberto });
  if (q.isLoading) return null;
  return q.data ? <Badge tom="ok">● Caixa aberto</Badge> : <Badge tom="red">● Caixa fechado</Badge>;
}

export default function CaixaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard papeis={["caixa"]}>
      <PainelShell nav={NAV} titulo="Caixa" migalhas={MIGALHAS} recolhivel extraHeader={<StatusCaixa />}>
        {children}
      </PainelShell>
    </RoleGuard>
  );
}
