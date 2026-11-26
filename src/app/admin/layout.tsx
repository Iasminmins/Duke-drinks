"use client";

import { CreditCard, LayoutDashboard, QrCode, Settings, Soup, Ticket, Users, Warehouse, Boxes, ScanBarcode, ConciergeBell, ChefHat, Files } from "lucide-react";
import { RoleGuard } from "@/components/layout/role-guard";
import { PainelShell, type ItemNav } from "@/components/layout/painel-shell";
import { AvisoAssinatura } from "@/components/layout/aviso-assinatura";

const NAV: ItemNav[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exato: true },
  { href: "/admin", label: "Operação", icon: ConciergeBell, somenteGrupo: true },
  { href: "/caixa/balcao", label: "Caixa de balcão", icon: ScanBarcode, modulo: "balcao" },
  { href: "/garcom", label: "Atendimento", icon: ConciergeBell },
  { href: "/kds/cozinha", label: "Produção", icon: ChefHat },
  {
    href: "/admin/categorias",
    label: "Cardápio",
    icon: Soup,
    somenteGrupo: true,
    filhos: [
      { href: "/admin/categorias", label: "Categorias" },
      { href: "/admin/produtos", label: "Produtos" },
      { href: "/admin/adicionais", label: "Adicionais" },
    ],
  },
  { href: "/admin/setores", label: "Setores", icon: Warehouse },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes, modulo: "estoque" },
  { href: "/caixa", label: "Comandas", icon: Ticket },
  { href: "/admin/comandas", label: "Cartões de comanda", icon: Files },
  { href: "/admin/mesas", label: "Mesas", icon: QrCode },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard },
];

const MIGALHAS = {
  "/admin": "Admin",
  "/admin/produtos": "Produtos",
  "/admin/categorias": "Categorias",
  "/admin/adicionais": "Adicionais",
  "/admin/setores": "Setores",
  "/admin/estoque": "Estoque",
  "/admin/comandas": "Cartões de comanda",
  "/admin/mesas": "Mesas",
  "/admin/usuarios": "Usuários",
  "/admin/configuracoes": "Configurações",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard papeis={["admin"]}>
      <PainelShell nav={NAV} titulo="Admin" migalhas={MIGALHAS} extraHeader={<AvisoAssinatura />}>
        {children}
      </PainelShell>
    </RoleGuard>
  );
}
