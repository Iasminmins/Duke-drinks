import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Papel } from "@/types";

export const COOKIE = "duke_sessao";
export const DURACAO_MS = 12 * 3600 * 1000; // um expediente

export interface Sessao {
  uid: string;
  papel: Papel;
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
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}
