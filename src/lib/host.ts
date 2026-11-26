/**
 * Descobre de qual negócio é a requisição pelo endereço acessado.
 * Roda no middleware (edge) e no servidor, então não importa nada de Node.
 *
 *   NEXT_PUBLIC_APP_DOMAIN=seuapp.com.br
 *     seuapp.com.br / www.seuapp.com.br  -> site do produto (cadastro, planos, painel da plataforma)
 *     duke.seuapp.com.br                 -> negócio "duke"
 *   localhost:3000 em desenvolvimento: use  duke.localhost:3000  (o Chrome resolve sozinho)
 *
 * Endereços desconhecidos não assumem uma loja por padrão: eles exibem a entrada compartilhada do Comandou.
 * DEFAULT_TENANT_SLUG só é aceito em desenvolvimento local.
 */
export type Destino = { tipo: "plataforma" } | { tipo: "tenant"; slug: string };

const RESERVADOS = new Set(["www", "app", "api", "admin", "painel", "plataforma", "mail", "suporte", "blog"]);

export function slugReservado(slug: string) {
  return RESERVADOS.has(slug);
}

export function dominioApp(): string {
  // NEXT_PUBLIC_ porque o formulário de cadastro também mostra o domínio no navegador
  return (process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000").toLowerCase();
}

export function resolverHost(hostBruto: string | null | undefined): Destino {
  const host = (hostBruto ?? "").toLowerCase().trim();
  const base = dominioApp();
  if (host === base || host === `www.${base}`) return { tipo: "plataforma" };
  if (host.endsWith(`.${base}`)) {
    const sub = host.slice(0, -(base.length + 1));
    if (sub && !sub.includes(".") && !RESERVADOS.has(sub)) return { tipo: "tenant", slug: sub };
    return { tipo: "plataforma" };
  }
  const local = host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
  const padrao = local ? process.env.DEFAULT_TENANT_SLUG?.trim().toLowerCase() : undefined;
  return padrao ? { tipo: "tenant", slug: padrao } : { tipo: "plataforma" };
}

/** endereço público de um negócio, ex.: https://duke.seuapp.com.br */
export function urlDoTenant(slug: string): string {
  const base = dominioApp();
  const proto = base.startsWith("localhost") ? "http" : "https";
  return `${proto}://${slug}.${base}`;
}

export function urlDaPlataforma(): string {
  const base = dominioApp();
  return `${base.startsWith("localhost") ? "http" : "https"}://${base}`;
}
