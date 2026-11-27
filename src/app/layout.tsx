import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { SwRegister } from "@/components/layout/sw-register";
import { AdminShellGlobal } from "@/components/layout/admin-shell-global";
import { MarcaProvider } from "@/components/brand/marca";
import { PRODUTO } from "@/lib/planos";
import { marcaDaRequisicao } from "@/server/tenant";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { plataforma, marca } = await marcaDaRequisicao();
  const nome = plataforma ? PRODUTO.nome : marca?.nome ?? PRODUTO.nome;
  return {
    title: { default: nome, template: `%s · ${nome}` },
    description: marca ? `Cardápio digital e pedidos — ${nome}.` : PRODUTO.slogan,
    manifest: "/manifest.webmanifest",
    icons: { icon: plataforma ? "/brand/receipt-checkmark-small.png" : marca?.logoUrl && !marca.logoUrl.startsWith("data:") ? marca.logoUrl : "/icon.svg", apple: plataforma ? "/brand/receipt-checkmark-small.png" : "/icon.svg" },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: nome },
  };
}

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** a cor da marca do negócio substitui o dourado padrão em todo o sistema */
function estiloDaMarca(cor: string | undefined) {
  if (!cor || !/^#[0-9a-fA-F]{6}$/.test(cor)) return null;
  return `:root{--color-gold:${cor};--color-gold-600:color-mix(in srgb,${cor} 82%,black);--color-gold-soft:color-mix(in srgb,${cor} 14%,transparent);}`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { plataforma, marca } = await marcaDaRequisicao();
  const css = estiloDaMarca(marca?.cor);
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body>
        <MarcaProvider marca={marca} plataforma={plataforma}>
          <Providers>
            <OfflineBanner />
            <SwRegister />
            {!plataforma && !marca ? <NegocioNaoEncontrado /> : <AdminShellGlobal>{children}</AdminShellGlobal>}
          </Providers>
        </MarcaProvider>
      </body>
    </html>
  );
}

function NegocioNaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="font-display text-5xl text-gold">Endereço não encontrado</p>
        <p className="mt-3 text-muted">Nenhum estabelecimento usa este endereço. Confira o link com quem te enviou.</p>
      </div>
    </main>
  );
}
