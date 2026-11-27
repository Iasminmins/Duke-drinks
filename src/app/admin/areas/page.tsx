"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  ChefHat,
  ClipboardList,
  ConciergeBell,
  QrCode,
  Store,
  Tags,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LinkArea = { href: string; label: string };
type Area = { titulo: string; descricao: string; icon: LucideIcon; links: LinkArea[] };

const AREAS: Area[] = [
  {
    titulo: "Salão e atendimento",
    descricao: "Abra comandas, acompanhe pedidos e mostre o QR ao cliente.",
    icon: ConciergeBell,
    links: [
      { href: "/garcom", label: "Abrir Atendimento" },
      { href: "/caixa", label: "Comandas" },
      { href: "/admin/mesas", label: "Cadastrar mesas" },
      { href: "/admin/comandas", label: "Cartões e QR das comandas" },
    ],
  },
  {
    titulo: "Cozinha e bar",
    descricao: "Confira os pedidos na tela de produção e organize os setores.",
    icon: ChefHat,
    links: [
      { href: "/kds/cozinha", label: "Abrir Cozinha" },
      { href: "/kds/bar", label: "Abrir Bar" },
      { href: "/admin/setores", label: "Configurar setores" },
    ],
  },
  {
    titulo: "Caixa e vendas",
    descricao: "Registre vendas, confira o movimento e acompanhe o histórico.",
    icon: Wallet,
    links: [
      { href: "/caixa/balcao", label: "Caixa de balcão" },
      { href: "/caixa/dia", label: "Caixa do dia" },
      { href: "/caixa/historico", label: "Histórico de vendas" },
      { href: "/admin/estoque", label: "Estoque" },
    ],
  },
  {
    titulo: "Cardápio que aparece no QR",
    descricao: "Edite os produtos, categorias e adicionais que os clientes podem ver e pedir.",
    icon: BookOpen,
    links: [
      { href: "/admin/categorias", label: "Editar categorias" },
      { href: "/admin/produtos", label: "Editar produtos e preços" },
      { href: "/admin/adicionais", label: "Editar adicionais" },
      { href: "/garcom", label: "Testar o QR em uma comanda" },
    ],
  },
  {
    titulo: "Loja e equipe",
    descricao: "Prepare os cadastros antes de liberar o sistema para os funcionários.",
    icon: Store,
    links: [
      { href: "/admin/setores", label: "Setores de preparo" },
      { href: "/admin/mesas", label: "Mesas" },
      { href: "/admin/usuarios", label: "Cadastrar funcionários" },
      { href: "/admin/configuracoes", label: "Configurações da loja" },
    ],
  },
];

const ACESSOS_EQUIPE = [
  { papel: "Caixa", rota: "/caixa" },
  { papel: "Salão", rota: "/garcom" },
  { papel: "Cozinha", rota: "/kds/cozinha" },
  { papel: "Bar", rota: "/kds/bar" },
];

function LinkAcao({ href, label }: LinkArea) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line bg-bg-soft px-3 py-2 text-sm font-medium text-cream transition-colors hover:border-gold/50 hover:bg-gold-soft"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 shrink-0 text-gold" aria-hidden />
    </Link>
  );
}

function AreaCard({ area }: { area: Area }) {
  const Icon = area.icon;
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-2xl">{area.titulo}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{area.descricao}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {area.links.map((link) => <LinkAcao key={`${link.href}-${link.label}`} {...link} />)}
      </div>
    </Card>
  );
}

export default function AreasAdminPage() {
  const copiarAcesso = async (rota: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/login?next=${encodeURIComponent(rota)}`);
      toast.success("Link de acesso copiado");
    } catch {
      toast.error("Não consegui copiar o link neste navegador");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mt-3 max-w-3xl text-sm text-muted sm:text-base">
          Entre em cada tela como administradora, configure a loja e confira o fluxo antes de compartilhar os acessos com a equipe.
        </p>
      </div>

      <Card className="border-gold/40 bg-gold-soft/30 p-5">
        <div className="flex items-start gap-3">
          <QrCode className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden />
          <div>
            <h2 className="font-semibold">O que aparece no QR do cliente?</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              O cliente vê o cardápio publicado: produtos e categorias ativos, com seus preços e adicionais. Edite esses dados em Cardápio; depois abra uma comanda em Atendimento e use “Mostrar QR” para conferir a experiência.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/produtos"><Button size="sm"><Tags className="h-4 w-4" /> Editar cardápio</Button></Link>
              <Link href="/admin/comandas"><Button size="sm" variant="secondary"><QrCode className="h-4 w-4" /> Gerenciar QRs</Button></Link>
              <Link href="/garcom"><Button size="sm" variant="secondary"><ConciergeBell className="h-4 w-4" /> Testar no Atendimento</Button></Link>
            </div>
          </div>
        </div>
      </Card>

      <section aria-labelledby="lista-areas">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gold" aria-hidden />
          <h2 id="lista-areas" className="font-display text-2xl">Acessar uma área</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {AREAS.map((area) => <AreaCard key={area.titulo} area={area} />)}
        </div>
      </section>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Users className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl">Acessos para os funcionários</h2>
            <p className="mt-1 text-sm text-muted">
              Primeiro cadastre cada pessoa em Usuários. Depois copie o link da função e envie junto com o login e a senha criados para ela.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ACESSOS_EQUIPE.map(({ papel, rota }) => (
                <div key={papel} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg-soft p-3">
                  <div>
                    <p className="font-medium">{papel}</p>
                    <p className="mt-0.5 text-xs text-subtle">Abre a tela de {papel.toLowerCase()}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => void copiarAcesso(rota)}>Copiar link</Button>
                </div>
              ))}
            </div>
            <Link href="/admin/usuarios" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gold hover:underline">
              Cadastrar ou editar funcionários <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
