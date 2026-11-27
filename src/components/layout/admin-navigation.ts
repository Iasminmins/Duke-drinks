import { CreditCard, LayoutDashboard, LayoutGrid, QrCode, Settings, Soup, Ticket, Users, Warehouse, Boxes, ScanBarcode, ConciergeBell, ChefHat, Files, History, Wallet } from "lucide-react";
import type { ItemNav } from "@/components/layout/painel-shell";

export const ADMIN_NAV: ItemNav[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exato: true },
  { href: "/admin/areas", label: "Áreas de trabalho", icon: LayoutGrid },
  { href: "/caixa/balcao", label: "Caixa de balcão", icon: ScanBarcode, modulo: "balcao" },
  { href: "/garcom", label: "Atendimento", icon: ConciergeBell },
  {
    href: "/kds/cozinha",
    label: "Produção",
    icon: ChefHat,
    somenteGrupo: true,
    filhos: [
      { href: "/kds/cozinha", label: "Cozinha" },
      { href: "/kds/bar", label: "Bar" },
    ],
  },
  {
    href: "/admin/categorias",
    label: "Cardápio",
    icon: Soup,
    somenteGrupo: true,
    filhos: [
      { href: "/admin/categorias", label: "Categorias" },
      { href: "/admin/produtos", label: "Produtos" },
      { href: "/admin/produtos/etiquetas", label: "Códigos de barras" },
      { href: "/admin/adicionais", label: "Adicionais" },
    ],
  },
  { href: "/admin/setores", label: "Setores", icon: Warehouse },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes, modulo: "estoque" },
  { href: "/caixa", label: "Comandas", icon: Ticket, exato: true },
  { href: "/caixa/dia", label: "Caixa do dia", icon: Wallet },
  { href: "/caixa/historico", label: "Histórico", icon: History },
  { href: "/admin/comandas", label: "Cartões de comanda", icon: Files },
  { href: "/admin/mesas", label: "Mesas", icon: QrCode },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard },
];

export const ADMIN_MIGALHAS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/areas": "Áreas de trabalho",
  "/admin/produtos": "Produtos",
  "/admin/produtos/etiquetas": "Etiquetas de produtos",
  "/admin/categorias": "Categorias",
  "/admin/adicionais": "Adicionais",
  "/admin/setores": "Setores",
  "/admin/estoque": "Estoque",
  "/admin/comandas": "Cartões de comanda",
  "/admin/mesas": "Mesas",
  "/admin/usuarios": "Usuários",
  "/admin/configuracoes": "Configurações",
  "/caixa": "Comandas",
  "/caixa/balcao": "Balcão",
  "/caixa/dia": "Caixa do dia",
  "/caixa/historico": "Histórico",
  "/garcom": "Atendimento",
  "/kds": "Produção",
  "/assinatura": "Assinatura",
};
