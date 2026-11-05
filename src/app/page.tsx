import Link from "next/link";
import { ChefHat, CircleDollarSign, ConciergeBell, Martini, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Coroa } from "@/components/brand/coroa";
import { MesasDemo } from "@/components/home/mesas-demo";

const EQUIPE = [
  { href: "/garcom", label: "Garçom", desc: "Mapa de mesas, abrir comanda, chamados", icon: ConciergeBell },
  { href: "/kds/cozinha", label: "Cozinha", desc: "KDS de petiscos e porções", icon: ChefHat },
  { href: "/kds/bar", label: "Bar", desc: "KDS de chopp e drinks", icon: Martini },
  { href: "/caixa", label: "Caixa", desc: "Baixa de pagamentos e fechamento", icon: CircleDollarSign },
  { href: "/admin", label: "Admin", desc: "Cardápio, mesas, QR e relatórios", icon: ShieldCheck },
];

export default function Home() {
  return (
    <main className="bg-pub min-h-dvh px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-8 font-display text-5xl leading-none sm:text-6xl">Sistema de pedidos</h1>
          <p className="mt-3 max-w-lg text-muted">
            Os dados ficam no banco de dados na nuvem. Qualquer aparelho conectado vê o mesmo movimento, em tempo real.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            <Coroa className="h-3 w-5" /> Experiência do cliente (QR da mesa)
          </h2>
          <MesasDemo />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            <Coroa className="h-3 w-5" /> Equipe
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EQUIPE.map(({ href, label, desc, icon: Icon }) => (
              <Link
                key={href}
                href={`/login?next=${encodeURIComponent(href)}`}
                className="group rounded-card border border-line bg-surface p-5 transition-colors hover:border-gold/50"
              >
                <Icon className="h-6 w-6 text-gold" />
                <p className="mt-4 font-display text-3xl leading-none">{label}</p>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-card border border-line bg-bg-soft p-5 text-sm text-muted">
          <p className="font-semibold text-cream">Roteiro rápido de demonstração</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Entre como <b className="text-cream">Garçom</b> (<b className="text-gold">rafael</b> / <b className="text-gold">duke123</b>), abra uma mesa e informe nome e celular do cliente. O sistema gera o <b className="text-cream">código da comanda</b>.</li>
            <li>Em outra aba, abra o <b className="text-cream">cardápio da mesa</b> (cliente), faça um pedido e digite o código.</li>
            <li>Entre como <b className="text-cream">Cozinha</b> (<b className="text-gold">marcos</b>) ou <b className="text-cream">Bar</b> (<b className="text-gold">leo</b>): o pedido aparece na tela de produção. Avance até “Pronto”.</li>
            <li>O garçom recebe o aviso e marca como entregue. O cliente acompanha tudo em “Minha comanda”, pede a conta e o <b className="text-cream">Caixa</b> (<b className="text-gold">juliana</b>) dá baixa.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
