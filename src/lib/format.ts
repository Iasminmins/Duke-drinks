const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatBRL = (v: number) => brl.format(v || 0);
export const formatHora = (iso: string) => hora.format(new Date(iso));
export const formatDataHora = (iso: string) => dataHora.format(new Date(iso));
export const formatData = (iso: string) => data.format(new Date(iso));

/** "há 3 min", "há 1 h" */
export function tempoDesde(iso: string, agora = Date.now()) {
  const min = Math.floor((agora - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export function minutosDesde(iso: string, agora = Date.now()) {
  return Math.floor((agora - new Date(iso).getTime()) / 60000);
}

/** converte "12,50" / "12.50" / "R$ 12,50" em número */
export function parseBRL(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

/** máscara de celular BR enquanto digita: (24) 99999-8888 */
export function mascaraCelular(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** celular guardado (só dígitos) → texto para exibir */
export function formatarCelular(digitos?: string): string {
  return digitos ? mascaraCelular(digitos) : "";
}
