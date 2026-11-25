import Image from "next/image";

/** Marca do Comandou (o produto), usada nas telas do domínio principal: cadastro e login único. */

/** site de venda do Comandou (termos, privacidade e o link da marca) */
export const SITE_COMANDOU = (process.env.NEXT_PUBLIC_SITE_URL || "https://comandou.com.br").replace(/\/$/, "");

export function MarcaComandou() {
  return (
    <a href={SITE_COMANDOU} aria-label="Comandou — página inicial" className="inline-flex items-center">
      <Image src="/brand/comandou-logo.png" alt="Comandou" width={1700} height={373} priority className="h-11 w-auto max-w-[230px] object-contain" />
    </a>
  );
}

/** fonte da marca (Archivo); o React coloca o link no <head> */
export function FontesComandou() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap"
      precedence="default"
    />
  );
}
