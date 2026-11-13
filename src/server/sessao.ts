import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Papel } from "@/types";

/** cookie da equipe de um negócio (cada subdomínio tem o seu) */
export const COOKIE = "sessao";
/** cookie do dono da plataforma (você), só no domínio principal */
export const COOKIE_PLATAFORMA = "sessao_plataforma";
export const DURACAO_MS = 12 * 3600 * 1000; // um expediente

export interface Sessao {
  uid: string;
  papel: Papel | "plataforma";
  /** estabelecimento a que a sessão pertence; a sessão não vale em outro subdomínio */
  eid: string;
  exp: number;
}

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou curto demais (.env.local)");
  return s;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const assinar = (dados: string) => createHmac("sha256", segredo()).update(dados).digest("base64url");

export function criarToken(s: Omit<Sessao, "exp">): string {
  const corpo = b64(JSON.stringify({ ...s, exp: Date.now() + DURACAO_MS }));
  return `${corpo}.${assinar(corpo)}`;
}

export function lerToken(token?: string): Sessao | null {
  if (!token) return null;
  const [corpo, sig] = token.split(".");
  if (!corpo || !sig) return null;
  const esperado = assinar(corpo);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(corpo, "base64url").toString()) as Sessao;
    return s.exp > Date.now() && typeof s.eid === "string" ? s : null;
  } catch {
    return null;
  }
}

/** compara a senha da plataforma (PLATAFORMA_SENHA) em tempo constante */
export function senhaPlataformaConfere(senha: string): boolean {
  const certa = process.env.PLATAFORMA_SENHA ?? "";
  if (certa.length < 12) return false; // sem senha forte configurada, o painel fica fechado
  const a = createHmac("sha256", "cmp").update(senha).digest();
  const b = createHmac("sha256", "cmp").update(certa).digest();
  return timingSafeEqual(a, b);
}
