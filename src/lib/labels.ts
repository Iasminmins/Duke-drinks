import type { FormaPagamento, Papel, StatusComanda, StatusMesa, StatusPedido } from "@/types";

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Administrador",
  caixa: "Caixa",
  garcom: "Garçom",
  cozinha: "Cozinha",
  bar: "Bar",
};

/** rota inicial de cada papel depois do login */
export const PAPEL_HOME: Record<Papel, string> = {
  admin: "/admin",
  caixa: "/caixa",
  garcom: "/garcom",
  cozinha: "/kds/cozinha",
  bar: "/kds/bar",
};

export const FORMA_LABEL: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  outro: "Outro",
};

export const FORMAS: FormaPagamento[] = ["dinheiro", "pix", "debito", "credito", "outro"];

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  recebido: "Recebido",
  preparando: "Preparando",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_COMANDA_LABEL: Record<StatusComanda, string> = {
  aberta: "Aberta",
  aguardando_pagamento: "Aguardando pagamento",
  fechada: "Fechada",
  cancelada: "Cancelada",
};

export const STATUS_MESA_LABEL: Record<StatusMesa, string> = {
  livre: "Livre",
  ocupada: "Ocupada",
  chamando: "Chamando",
  aguardando_pagamento: "Pediu a conta",
};

export const PROXIMO_STATUS: Partial<Record<StatusPedido, StatusPedido>> = {
  recebido: "preparando",
  preparando: "pronto",
  pronto: "entregue",
};
