"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Usuario } from "@/types";

interface SessionState {
  usuario: Usuario | null;
  /** epoch ms; sessão mock expira em 12h (um expediente) */
  expiraEm: number | null;
  entrar: (u: Usuario) => void;
  sair: () => void;
}

const DOZE_HORAS = 12 * 3600 * 1000;

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      usuario: null,
      expiraEm: null,
      entrar: (usuario) => set({ usuario, expiraEm: Date.now() + DOZE_HORAS }),
      sair: () => {
        // encerra também a sessão no servidor (cookie); falha de rede não impede a saída local
        try {
          void fetch("/api/rpc/logout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
            credentials: "same-origin",
          });
        } catch {}
        set({ usuario: null, expiraEm: null });
      },
    }),
    { name: "duke:sessao" },
  ),
);
