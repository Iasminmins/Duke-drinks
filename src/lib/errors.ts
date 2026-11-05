export function mensagemErro(e: unknown) {
  if (e instanceof Error) return e.message;
  return "Algo deu errado. Tente novamente.";
}
