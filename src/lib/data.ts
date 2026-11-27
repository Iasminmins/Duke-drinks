const PARTES_DATA = new Intl.DateTimeFormat("en", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Formata uma data como yyyy-mm-dd no fuso de operação do caixa. */
export function dataISOEmFuso(data = new Date()): string {
  const partes = Object.fromEntries(PARTES_DATA.formatToParts(data).map((p) => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

/** Desloca uma data civil sem depender do fuso local nem de horário de verão. */
export function deslocarDataISO(iso: string, dias: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match || !Number.isInteger(dias)) throw new RangeError("Data ou deslocamento inválido");
  const [, ano, mes, dia] = match;
  const base = Date.UTC(Number(ano), Number(mes) - 1, Number(dia));
  const validacao = new Date(base);
  if (
    validacao.getUTCFullYear() !== Number(ano) ||
    validacao.getUTCMonth() + 1 !== Number(mes) ||
    validacao.getUTCDate() !== Number(dia)
  ) {
    throw new RangeError("Data inválida");
  }
  const resultado = new Date(base + dias * 86_400_000);
  return `${resultado.getUTCFullYear()}-${String(resultado.getUTCMonth() + 1).padStart(2, "0")}-${String(resultado.getUTCDate()).padStart(2, "0")}`;
}
