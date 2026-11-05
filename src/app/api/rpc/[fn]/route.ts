import { NextResponse, type NextRequest } from "next/server";
import { ServiceError } from "@/services/_base";
import type { Usuario } from "@/types";
import { um } from "@/server/db";
import { SemSessao, type Ctx } from "@/server/comum";
import { REGISTRO } from "@/server/registry";
import { COOKIE, DURACAO_MS, criarToken, lerToken } from "@/server/sessao";

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ fn: string }> }) {
  const { fn } = await params;
  const handler = Object.prototype.hasOwnProperty.call(REGISTRO, fn) ? REGISTRO[fn] : undefined;
  if (!handler) return NextResponse.json({ ok: false, erro: "Operação desconhecida", codigo: "NAO_ENCONTRADO" }, { status: 404 });

  // proteção contra requisições vindas de outros sites
  const origem = req.headers.get("origin");
  if (origem) {
    try {
      if (new URL(origem).host !== req.headers.get("host")) {
        return NextResponse.json({ ok: false, erro: "Origem não permitida", codigo: "PROIBIDO" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, erro: "Origem inválida", codigo: "PROIBIDO" }, { status: 403 });
    }
  }

  let args: unknown[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.args)) args = body.args;
  } catch {
    // sem corpo: função sem argumentos
  }

  // sessão da equipe: cookie assinado + usuário ainda existe e está ativo (desativar corta o acesso na hora)
  let sessao: Ctx["sessao"] = null;
  const token = lerToken(req.cookies.get(COOKIE)?.value);
  if (token) {
    const u = await um<{ papel: Usuario["papel"]; ativo: boolean }>(`select papel, ativo from usuarios where id = $1`, [token.uid]);
    if (u?.ativo) sessao = { uid: token.uid, papel: u.papel };
  }

  let novaSessao: Usuario | null = null;
  let encerrar = false;
  const ctx: Ctx = {
    sessao,
    ip: ipDe(req),
    iniciarSessao: (u) => {
      novaSessao = u;
    },
    encerrarSessao: () => {
      encerrar = true;
    },
  };

  try {
    const dados = await handler(ctx, ...args);
    const res = new NextResponse(JSON.stringify({ ok: true, dados: dados ?? null }, (_k, v) => (v === null ? undefined : v)), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
    const seguro = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    if (novaSessao) {
      const u = novaSessao as Usuario;
      res.cookies.set(COOKIE, criarToken({ uid: u.id, papel: u.papel }), {
        httpOnly: true,
        sameSite: "lax",
        secure: seguro,
        path: "/",
        maxAge: DURACAO_MS / 1000,
      });
    } else if (encerrar) {
      res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: seguro, path: "/", maxAge: 0 });
    }
    return res;
  } catch (e) {
    if (e instanceof SemSessao) {
      return NextResponse.json({ ok: false, erro: e.message, codigo: "PROIBIDO", semSessao: true }, { status: 401 });
    }
    if (e instanceof ServiceError) {
      return NextResponse.json({ ok: false, erro: e.message, codigo: e.code }, { status: STATUS[e.code] ?? 400 });
    }
    const code = (e as { code?: string })?.code;
    console.error(`[rpc:${fn}]`, e);
    if (code && /^23/.test(code)) {
      return NextResponse.json({ ok: false, erro: "Dados inválidos para esta operação.", codigo: "INVALIDO" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, erro: "Erro interno. Tente novamente em instantes.", codigo: "INVALIDO" }, { status: 500 });
  }
}
