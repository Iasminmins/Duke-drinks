/** normaliza o celular para só dígitos; devolve null se for inválido (10 ou 11 dígitos com DDD) */
export function normalizarCelular(v: string): string | null {
  const dig = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return /^\d{10,11}$/.test(dig) ? dig : null;
}
