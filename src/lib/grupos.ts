type PapelLoja = "admin" | "caixa" | "garcom" | "cozinha" | "bar";

export function podeVincularEstabelecimento(dados: {
  emailOrigem: string | null | undefined;
  emailDestino: string | null | undefined;
  lojasOrigem: number;
  lojasDestino: number;
  quantidadeSolicitada: number;
}): boolean {
  const origem = dados.emailOrigem?.trim().toLocaleLowerCase("pt-BR");
  const destino = dados.emailDestino?.trim().toLocaleLowerCase("pt-BR");
  return !!origem && origem === destino && dados.lojasOrigem < dados.quantidadeSolicitada && dados.lojasDestino === 1;
}

export function podeAlternarEstabelecimento(dados: { papel: PapelLoja; mesmoGrupo: boolean; cancelado: boolean }): boolean {
  return dados.papel === "admin" && dados.mesmoGrupo && !dados.cancelado;
}
