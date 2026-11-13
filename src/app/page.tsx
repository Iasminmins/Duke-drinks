import Link from "next/link";
import { BellRing, Check, ChefHat, CircleDollarSign, QrCode, Smartphone, Users } from "lucide-react";
import { Coroa } from "@/components/brand/coroa";
import { PLANOS, PRODUTO, TIPOS_NEGOCIO } from "@/lib/planos";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/** site do produto: aparece no domínio principal (o endereço de cada negócio vai direto para o login) */

const RECURSOS = [
  { icon: QrCode, titulo: "QR por comanda", texto: "Cada cliente recebe o próprio QR. Aponta a câmera, vê o cardápio com foto e pede sem baixar app." },
  { icon: ChefHat, titulo: "Pedido direto na produção", texto: "O pedido cai na tela da cozinha, do bar ou da chapa na hora, com tempo e alerta sonoro." },
  { icon: BellRing, titulo: "Garçom avisado", texto: "Chamado do cliente, pedido pronto e pedido de conta aparecem no celular do garçom." },
  { icon: CircleDollarSign, titulo: "Caixa sem confusão", texto: "Baixa por Pix, cartão ou dinheiro, estorno com motivo e fechamento de caixa conferido." },
  { icon: Users, titulo: "Equipe com acesso certo", texto: "Garçom, caixa, cozinha e bar entram só no que é deles. Desativou o usuário, o acesso cai na hora." },
  { icon: Smartphone, titulo: "Funciona no que você já tem", texto: "Celular, tablet ou computador. Nada de maquininha especial nem instalação." },
];

export default function SiteDoProduto() {
  return (
    <main className="bg-pub min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-display text-2xl">
          <Coroa className="h-4 w-6 text-gold" /> {PRODUTO.nome}
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#planos" className="hidden text-muted hover:text-cream sm:inline">Planos</a>
          <Link href="/cadastro" className="rounded-[10px] bg-gold px-4 py-2 font-semibold text-bg hover:bg-gold-600">
            Testar grátis
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Para bares, restaurantes e lanchonetes</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] sm:text-7xl">
          O cliente pede pelo celular. A cozinha recebe na hora. O caixa fecha certinho.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">{PRODUTO.slogan} Pronto para usar hoje, sem instalar nada.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cadastro" className="inline-flex h-14 items-center rounded-[10px] bg-gold px-6 text-base font-semibold text-bg hover:bg-gold-600">
            Começar {PRODUTO.diasTeste} dias grátis
          </Link>
          <a href="#como-funciona" className="inline-flex h-14 items-center rounded-[10px] border border-line px-6 text-base hover:border-gold/50">
            Ver como funciona
          </a>
        </div>
        <p className="mt-4 text-sm text-subtle">Sem cartão de crédito. Cancele quando quiser.</p>
        <div className="mt-10 flex flex-wrap gap-2">
          {TIPOS_NEGOCIO.filter((t) => t.id !== "outro").map((t) => (
            <span key={t.id} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
              {t.label}
            </span>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="border-y border-line bg-bg-soft/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          {[
            ["1", "Abra a comanda", "O garçom cadastra nome e celular do cliente e mostra o QR. Ou imprime o cartão da comanda."],
            ["2", "O cliente pede", "Pelo próprio celular, de qualquer lugar do salão. Pode chamar o garçom e pedir a conta."],
            ["3", "Produção e caixa", "Cozinha e bar recebem os pedidos. No fim, o caixa dá baixa e a comanda fecha sozinha."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <p className="font-display text-6xl leading-none text-gold">{n}</p>
              <p className="mt-3 text-xl font-semibold">{t}</p>
              <p className="mt-2 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-4xl sm:text-5xl">O que vem no sistema</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-card border border-line bg-surface p-5">
              <Icon className="h-6 w-6 text-gold" />
              <p className="mt-4 text-lg font-semibold">{titulo}</p>
              <p className="mt-1 text-sm text-muted">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="font-display text-4xl sm:text-5xl">Planos</h2>
        <p className="mt-2 text-muted">
          Os {PRODUTO.diasTeste} primeiros dias são grátis, com tudo liberado. Depois você escolhe o plano.
        </p>
        <div className="mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
          {Object.values(PLANOS).map((p) => (
            <div
              key={p.id}
              className={cn("relative rounded-card border bg-surface p-6", p.destaque ? "border-gold" : "border-line")}
            >
              {p.destaque && (
                <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-bg">
                  Mais escolhido
                </span>
              )}
              <p className="font-display text-3xl">{p.nome}</p>
              <p className="mt-2 text-4xl font-semibold">
                {formatBRL(p.precoMensal)}
                <span className="text-base font-normal text-muted">/mês</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted">
                {p.itens.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {i}
                  </li>
                ))}
              </ul>
              <Link
                href="/cadastro"
                className={cn(
                  "mt-6 inline-flex h-12 w-full items-center justify-center rounded-[10px] font-semibold",
                  p.destaque ? "bg-gold text-bg hover:bg-gold-600" : "border border-line hover:border-gold/50",
                )}
              >
                Começar teste grátis
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-subtle">
          <span>© {new Date().getFullYear()} {PRODUTO.nome}</span>
          {/* TODO: publicar termos de uso e política de privacidade (LGPD) antes de vender e linkar aqui */}
        </div>
      </footer>
    </main>
  );
}
