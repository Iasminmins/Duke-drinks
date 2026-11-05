"use client";

import { LayoutDashboard, QrCode, Settings, Soup, Users, Warehouse } from "lucide-react";
import { RoleGuard } from "@/components/layout/role-guard";
import { PainelShell, type ItemNav } from "@/components/layout/painel-shell";

const NAV: ItemNav[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exato: true },
  {
    href: "/admin/produtos",
    label: "Cardápio",
    icon: Soup,
    filhos: [
      { href: "/admin/categorias", label: "Categorias" },
      { href: "/admin/produtos", label: "Produtos" },
      { href: "/admin/adicionais", label: "Adicionais" },
    ],
  },
  { href: "/admin/setores", label: "Setores", icon: Warehouse },
  { href: "/admin/mesas", label: "Mesas & QR", icon: QrCode },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

const MIGALHAS = {
  "/admin": "Admin",
  "/admin/produtos": "Produtos",
  "/admin/categorias": "Categorias",
  "/admin/adicionais": "Adicionais",
  "/admin/setores": "Setores",
  "/admin/mesas": "Mesas & QR",
  "/admin/usuarios": "Usuários",
  "/admin/configuracoes": "Configurações",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard papeis={["admin"]}>
      <PainelShell nav={NAV} titulo="Admin" migalhas={MIGALHAS}>
        {children}
      </PainelShell>
    </RoleGuard>
  );
}
