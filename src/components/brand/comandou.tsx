/** Marca do Comandou (o produto), usada nas telas do domínio principal: cadastro e login único. */

/** site de venda do Comandou (termos, privacidade e o link da marca) */
export const SITE_COMANDOU = (process.env.NEXT_PUBLIC_SITE_URL || "https://comandou.com.br").replace(/\/$/, "");

export function MarcaComandou() {
  return (
    <a href={SITE_COMANDOU} className="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight" style={{ fontStretch: "125%" }}>
      <svg viewBox="0 0 26 30" className="h-7 w-6" aria-hidden>
        <path d="M2 2h22v24l-2.75-2-2.75 2-2.75-2L13 26l-2.75-2-2.75 2-2.75-2L2 26V2Z" fill="#2340d9" />
        <path d="m7.5 13.5 3.8 3.8 7.2-7.6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      comandou
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
