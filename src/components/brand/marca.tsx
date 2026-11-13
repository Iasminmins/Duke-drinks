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

export function MarcaProvider({ marca, children }: { marca: MarcaCliente | null; children: ReactNode }) {
  return <Ctx.Provider value={marca}>{children}</Ctx.Provider>;
}

/** null = site do produto (domínio principal) */
export function useMarca() {
  return useContext(Ctx);
}
