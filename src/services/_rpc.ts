import { ServiceError } from "./_base";

interface Resposta {
  ok: boolean;
  dados?: unknown;
  erro?: string;
  codigo?: ServiceError["code"];
  semSessao?: boolean;
  assinaturaBloqueada?: boolean;
}

/**
 * Chama uma operação do servidor (POST /api/rpc/<nome>).
 * O servidor confere a sessão (cookie) ou o código da comanda; nada de regra de negócio roda aqui.
 */
export async function rpc<T>(nome: string, ...args: unknown[]): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/rpc/${nome}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ args }),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ServiceError("Sem conexão com o servidor. Verifique a internet e tente de novo.", "INVALIDO");
  }

  let json: Resposta;
  try {
    json = (await res.json()) as Resposta;
  } catch {
    throw new ServiceError("Resposta inesperada do servidor. Tente de novo.", "INVALIDO");
  }

  if (res.ok && json.ok) return (json.dados ?? null) as T;

  // sessão da equipe expirou: volta para a tela de aviso
  if (res.status === 401 && json.semSessao && typeof window !== "undefined") {
    const p = window.location.pathname;
    if (!p.startsWith("/sessao-expirada") && !p.startsWith("/login")) {
      try {
        localStorage.removeItem("sessao");
      } catch {}
      window.location.assign("/sessao-expirada");
    }
  }

  // assinatura vencida ou suspensa: a equipe vai para a tela de assinatura
  if (res.status === 402 && json.assinaturaBloqueada && typeof window !== "undefined") {
    const p = window.location.pathname;
    const equipe = !p.startsWith("/c/") && !p.startsWith("/login") && !p.startsWith("/assinatura");
    if (equipe) window.location.assign("/assinatura");
  }
  throw new ServiceError(json.erro ?? "Algo deu errado. Tente novamente.", json.codigo ?? "INVALIDO");
}
