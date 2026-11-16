import { NextResponse, type NextRequest } from "next/server";
import { ServiceError } from "@/services/_base";
import type { Usuario } from "@/types";
import { comTenant, um } from "@/server/db";
import { SemSessao, type Ctx } from "@/server/comum";
import { LIBERADAS_SEM_ASSINATURA, REGISTRO, REGISTRO_PLATAFORMA } from "@/server/registry";
import { COOKIE, COOKIE_PLATAFORMA, DURACAO_MS, criarToken, lerToken } from "@/server/sessao";
import { situacao, tenantDoHost } from "@/server/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<ServiceError["code"], number> = {
  INVALIDO: 400,
  NAO_ENCONTRADO: 404,
  PROIBIDO: 403,
  CONFLITO: 409,
};

function ipDe(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

const erro = (status: number, erro: string, codigo: ServiceError["code"], extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, erro, codigo, ...extra }, { status });

export async function POST(req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  const { fn } = await params;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  // proteção contra requisições vindas de outros sites
  const origem = req.headers.get("origin");
  if (origem) {
    try {
      if (new URL(origem).host !== host) return erro(403, "Origem não permitida", "PROIBIDO");
    } catch {
      return erro(403, "Origem inválida", "PROIBIDO");
    }
  }

  // de qual negócio é esta chamada? (pelo subdomínio)
  const { plataforma, tenant } = await tenantDoHost(host);
  if (!plataforma && !tenant) return erro(404, "Estabelecimento não encontrado", "NAO_ENCONTRADO");

  // no domínio principal só existem as operações da plataforma; nos negócios, só as do negócio
  const tabela = plataforma ? REGISTRO_PLATAFORMA : REGISTRO;
  const handler = Object.prototype.hasOwnProperty.call(tabela, fn) ? tabela[fn] : undefined;
  if (!handler) return erro(404, "Operação desconhecida", "NAO_ENCONTRADO");

  // assinatura vencida/suspensa: só deixa entrar e ver a situação
  if (tenant) {
    const s = situacao(tenant);
    if (!s.liberado && !LIBERADAS_SEM_ASSINATURA.has(fn)) {
      return erro(402, `${s.motivo} O sistema está bloqueado até a regularização.`, "PROIBIDO", { assinaturaBloqueada: true });
    }
  }

  let args: unknown[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.args)) args = body.args;
  } catch {
    // sem corpo: função sem argumentos
  }

  const tokenPlat = plataforma ? lerToken(req.cookies.get(COOKIE_PLATAFORMA)?.value) : null;
  let novaSessao: Usuario | null = null;
  let encerrar = false;
  let novaPlataforma = false;

  try {
    const dados = await comTenant(tenant?.id ?? null, async () => {
      // sessão da equipe: cookie assinado, do MESMO negócio, e usuário ainda existe e está ativo
      let sessao: Ctx["sessao"] = null;
      const token = tenant ? lerToken(req.cookies.get(COOKIE)?.value) : null;
      if (token && tenant && token.eid === tenant.id && token.papel !== "plataforma" && !token.tipo) {
        const u = await um<{ papel: Usuario["papel"]; ativo: boolean }>(`select papel, ativo from usuarios where id = $1`, [token.uid]);
        if (u?.ativo) sessao = { uid: token.uid, papel: u.papel };
      }
      const ctx: Ctx = {
        sessao,
        tenant,
        plataformaLogada: tokenPlat?.papel === "plataforma",
        ip: ipDe(req),
        iniciarSessao: (u) => {
          novaSessao = u;
        },
        encerrarSessao: () => {
          encerrar = true;
        },
        iniciarSessaoPlataforma: () => {
          novaPlataforma = true;
        },
      };
      return handler(ctx, ...args);
    });

    const res = new NextResponse(JSON.stringify({ ok: true, dados: dados ?? null }, (_k, v) => (v === null ? undefined : v)), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
    const seguro = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    const opcoes = { httpOnly: true, sameSite: "lax" as const, secure: seguro, path: "/" };
    if (novaSessao && tenant) {
      const u = novaSessao as Usuario;
      res.cookies.set(COOKIE, criarToken({ uid: u.id, papel: u.papel, eid: tenant.id }), { ...opcoes, maxAge: DURACAO_MS / 1000 });
    } else if (novaPlataforma) {
      res.cookies.set(COOKIE_PLATAFORMA, criarToken({ uid: "plataforma", papel: "plataforma", eid: "*" }), {
        ...opcoes,
        sameSite: "strict",
        maxAge: DURACAO_MS / 1000,
      });
    } else if (encerrar) {
      res.cookies.set(plataforma ? COOKIE_PLATAFORMA : COOKIE, "", { ...opcoes, maxAge: 0 });
    }
    return res;
  } catch (e) {
    if (e instanceof SemSessao) {
      return NextResponse.json({ ok: false, erro: e.message, codigo: "PROIBIDO", semSessao: true }, { status: 401 });
    }
    if (e instanceof ServiceError) return erro(STATUS[e.code] ?? 400, e.message, e.code);
    const code = (e as { code?: string })?.code;
    console.error(`[rpc:${fn}]`, e);
    if (code && /^23/.test(code)) return erro(400, "Dados inválidos para esta operação.", "INVALIDO");
    if (code === "42501") return erro(403, "Acesso negado.", "PROIBIDO");
    return erro(500, "Erro interno. Tente novamente em instantes.", "INVALIDO");
  }
}
