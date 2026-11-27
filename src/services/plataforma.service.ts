import type { Assinatura, PrimeirosPassos, SolicitacaoEstabelecimento } from "@/server/handlers/acesso";
import type { ContaAcesso, NegocioResumo, NovoNegocio, SolicitacaoEstabelecimentoResumo } from "@/server/handlers/plataforma";
import type { Usuario } from "@/types";
import { rpc } from "./_rpc";

export type { Assinatura, ContaAcesso, NegocioResumo, NovoNegocio, PrimeirosPassos, SolicitacaoEstabelecimento, SolicitacaoEstabelecimentoResumo };

/** login único do site: e-mail + senha do dono -> negócios dele (com link que já entra) */
export function acessarConta(email: string, senha: string): Promise<ContaAcesso[]> {
  return rpc("acessarConta", email, senha);
}

// ---------------------------------------------------------------- negócio (subdomínio)
export function getAssinatura(): Promise<Assinatura> {
  return rpc("getAssinatura");
}

export function solicitarEstabelecimentos(quantidade: number): Promise<SolicitacaoEstabelecimento> {
  return rpc("solicitarEstabelecimentos", quantidade);
}

/** troca o link de entrada do cadastro por uma sessão do admin */
export function entrarComToken(t: string): Promise<Usuario> {
  return rpc("entrarComToken", t);
}

export function getPrimeirosPassos(): Promise<PrimeirosPassos> {
  return rpc("getPrimeirosPassos");
}

// ---------------------------------------------------------------- site do produto (domínio principal)
export function verificarSlug(slug: string): Promise<{ slug: string; disponivel: boolean; motivo?: string }> {
  return rpc("verificarSlug", slug);
}

export function cadastrarNegocio(dados: NovoNegocio): Promise<{ slug: string; url: string; entrada: string }> {
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

export function plataformaListarSolicitacoes(): Promise<SolicitacaoEstabelecimentoResumo[]> {
  return rpc("plataformaListarSolicitacoes");
}

export function plataformaAtualizarSolicitacao(id: string, status: "em_contato" | "resolvida"): Promise<void> {
  return rpc("plataformaAtualizarSolicitacao", id, status);
}

export function plataformaVincularEstabelecimento(solicitacaoId: string, estabelecimentoId: string): Promise<number> {
  return rpc("plataformaVincularEstabelecimento", solicitacaoId, estabelecimentoId);
}
