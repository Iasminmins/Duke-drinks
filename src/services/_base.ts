export class ServiceError extends Error {
  constructor(
    message: string,
    public code: "NAO_ENCONTRADO" | "INVALIDO" | "PROIBIDO" | "CONFLITO" = "INVALIDO",
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
