import "server-only";

/**
 * Limitador simples em memória (por instância do servidor): bloqueia chaves com
 * falhas demais numa janela. Protege login e tentativa de adivinhar o código da comanda.
 */
const g = globalThis as unknown as { __dukeLimite?: Map<string, number[]> };
const mapa: Map<string, number[]> = (g.__dukeLimite ??= new Map<string, number[]>());

export function bloqueado(chave: string, max: number, janelaMs: number): boolean {
  const agora = Date.now();
  const falhas = (mapa.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  mapa.set(chave, falhas);
  return falhas.length >= max;
}

export function registrarFalha(chave: string) {
  mapa.set(chave, [...(mapa.get(chave) ?? []), Date.now()]);
}

export function limpar(chave: string) {
  mapa.delete(chave);
}
