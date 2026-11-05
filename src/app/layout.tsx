import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { SwRegister } from "@/components/layout/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Duke | Drinks e Choperia", template: "%s · Duke" },
  description: "Cardápio digital e gestão de pedidos do Duke Drinks e Choperia — Shopping Belvedere.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Duke" },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </head>
      <body>
        <Providers>
          <OfflineBanner />
          <SwRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
