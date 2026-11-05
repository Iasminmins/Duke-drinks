import type { ResumoDashboard } from "@/types";
import { rpc } from "./_rpc";

/** indicadores das últimas 24h (cobre o expediente que vira a meia-noite) */
export function getResumoDashboard(): Promise<ResumoDashboard> {
  return rpc("getResumoDashboard");
}
