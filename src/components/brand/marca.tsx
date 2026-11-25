"use client";

import { createContext, useContext, type ReactNode } from "react";

/** identidade do negócio que está sendo acessado (vem do servidor pelo subdomínio) */
export interface MarcaCliente {
  slug: string;
  tipo: string;
  nome: string;
  logoUrl: string | null;
  cor: string;
  endereco: string;
}

const Ctx = createContext<MarcaCliente | null>(null);
const PlataformaCtx = createContext(false);

export function MarcaProvider({ marca, plataforma, children }: { marca: MarcaCliente | null; plataforma: boolean; children: ReactNode }) {
  return <PlataformaCtx.Provider value={plataforma}><Ctx.Provider value={marca}>{children}</Ctx.Provider></PlataformaCtx.Provider>;
}

/** null = site do produto (domínio principal) */
export function useMarca() {
  return useContext(Ctx);
}

/** true quando o endereço atual é o domínio central do Comandou, mesmo com uma empresa selecionada na sessão */
export function useDominioPlataforma() {
  return useContext(PlataformaCtx);
}
