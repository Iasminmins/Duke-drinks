"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** dados que mudam pouco: não precisam ser recarregados a cada ciclo */
const ESTATICAS = new Set(["cardapio", "cardapio-admin", "estabelecimento", "usuarios", "mesas"]);

const INTERVALO_MS = 5000;

/**
 * Mantém as telas sincronizadas com o servidor: a cada poucos segundos (com a aba visível)
 * recarrega as consultas ativas. Qualquer ação concluída também recarrega na hora (ver Providers).
 * Para trocar por WebSocket/SSE no futuro, só este hook muda.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      qc.invalidateQueries({ predicate: (q) => !ESTATICAS.has(String(q.queryKey[0])) });
    };
    const id = setInterval(tick, INTERVALO_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", tick);
    };
  }, [qc]);
}
