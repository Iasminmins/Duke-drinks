import type { Assinatura } from "@/server/handlers/acesso";
import type { NegocioResumo, NovoNegocio } from "@/server/handlers/plataforma";
import { rpc } from "./_rpc";

export type { Assinatura, NegocioResumo, NovoNegocio };

// ---------------------------------------------------------------- negócio (subdomínio)
export function getAssinatura(): Promise<Assinatura> {
  return rpc("getAssinatura");
}

// ---------------------------------------------------------------- site do produto (domínio principal)
export function verificarSlug(slug: string): Promise<{ slug: string; disponivel: boolean; motivo?: string }> {
  return rpc("verificarSlug", slug);
}

export function cadastrarNegocio(dados: NovoNegocio): Promise<{ slug: string; url: string }> {
  return rpc("cadastrarNegocio", dados);
}

export function plataformaEntrar(senha: string): Promise<boolean> {
  return rpc("plataformaEntrar", senha);
}

export function plataformaSair(): Promise<void> {
  return rpc("plataformaSair");
}

export function plataformaSessao(): Promise<boolean> {
  return rpc("plataformaSessao");
}

export function plataformaListar(): Promise<NegocioResumo[]> {
  return rpc("plataformaListar");
}

export function plataformaAtualizar(
  id: string,
  dados: { status?: string; plano?: string; pagoAte?: string | null; trialAte?: string | null; observacao?: string },
): Promise<void> {
  return rpc("plataformaAtualizar", id, dados);
}
