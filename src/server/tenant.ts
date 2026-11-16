import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { resolverHost } from "@/lib/host";
import { comTenant, poolPlataforma, um } from "./db";

export interface Tenant {
  id: string;
  slug: string;
  tipo: string;
  plano: string;
  status: "trial" | "ativo" | "suspenso" | "cancelado";
  trialAte: string | null;
  pagoAte: string | null;
}

export interface Situacao {
  liberado: boolean;
  status: Tenant["status"];
  /** dias de teste ou de assinatura que ainda restam (quando faz sentido) */
  diasRestantes: number | null;
  motivo?: string;
}

/** dias de tolerância depois do vencimento antes de bloquear */
const CARENCIA_DIAS = 5;
const DIA = 24 * 3600 * 1000;

export function situacao(t: Tenant): Situacao {
  const agora = Date.now();
  const dias = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - agora) / DIA) : null);
  if (t.status === "cancelado") return { liberado: false, status: t.status, diasRestantes: null, motivo: "Conta cancelada." };
  if (t.status === "suspenso") return { liberado: false, status: t.status, diasRestantes: null, motivo: "Acesso suspenso." };
  if (t.status === "trial") {
    const d = dias(t.trialAte);
    if (d !== null && d <= 0) return { liberado: false, status: t.status, diasRestantes: 0, motivo: "O período de teste terminou." };
    return { liberado: true, status: t.status, diasRestantes: d };
  }
  const d = dias(t.pagoAte);
  if (d !== null && d <= -CARENCIA_DIAS) {
    return { liberado: false, status: t.status, diasRestantes: d, motivo: "A assinatura venceu." };
  }
  return { liberado: true, status: t.status, diasRestantes: d };
}

const TENANT_SQL = `select id, slug, tipo, plano, status, trial_ate as "trialAte", pago_ate as "pagoAte" from tenants`;

// cache curto em memória: evita uma consulta extra por requisição
const g = globalThis as unknown as { __tenants?: Map<string, { t: Tenant | null; exp: number }> };
const memo = (g.__tenants ??= new Map());

export async function tenantPorSlug(slug: string): Promise<Tenant | null> {
  const k = slug.toLowerCase();
  const hit = memo.get(k);
  if (hit && hit.exp > Date.now()) return hit.t;
  const r = await poolPlataforma().query<Tenant>(`${TENANT_SQL} where slug = $1`, [k]);
  const t = r.rows[0] ?? null;
  memo.set(k, { t, exp: Date.now() + 30_000 });
  return t;
}

export function esquecerTenant(slug?: string) {
  if (slug) memo.delete(slug.toLowerCase());
  else memo.clear();
}

/**
 * O domínio principal mostra o site do produto, mas também carrega o negócio
 * padrão (hoje, só o Duke) direto nele — sem precisar de subdomínio — enquanto
 * não existem outros negócios de verdade cadastrados. DEFAULT_TENANT_SLUG
 * aponta pra esse negócio (slug na tabela "tenants").
 */
export async function tenantDoHost(host: string | null): Promise<{ plataforma: boolean; tenant: Tenant | null }> {
  const d = resolverHost(host);
  if (d.tipo === "plataforma") {
    const padrao = process.env.DEFAULT_TENANT_SLUG?.trim().toLowerCase();
    return { plataforma: true, tenant: padrao ? await tenantPorSlug(padrao) : null };
  }
  return { plataforma: false, tenant: await tenantPorSlug(d.slug) };
}

export interface Marca {
  slug: string;
  tipo: string;
  nome: string;
  logoUrl: string | null;
  cor: string;
  endereco: string;
}

/** dados visuais do negócio para o layout (nome, logo, cor) — uma vez por requisição */
export const marcaDaRequisicao = cache(async (): Promise<{ plataforma: boolean; marca: Marca | null }> => {
  const h = await headers();
  const { plataforma, tenant } = await tenantDoHost(h.get("x-forwarded-host") ?? h.get("host"));
  if (!tenant) return { plataforma, marca: null };
  const e = await comTenant(tenant.id, () =>
    um<{ nome: string; logoUrl: string | null; cor: string; endereco: string }>(
      `select nome, logo_url as "logoUrl", cor_primaria as cor, endereco from estabelecimento limit 1`,
    ),
  );
  if (!e) return { plataforma, marca: null };
  return { plataforma, marca: { slug: tenant.slug, tipo: tenant.tipo, ...e } };
});
