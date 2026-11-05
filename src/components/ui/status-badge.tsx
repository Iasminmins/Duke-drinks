import { Badge, type TomBadge } from "./badge";
import { STATUS_COMANDA_LABEL, STATUS_MESA_LABEL, STATUS_PEDIDO_LABEL } from "@/lib/labels";
import type { StatusComanda, StatusMesa, StatusPedido } from "@/types";

const tomPedido: Record<StatusPedido, TomBadge> = {
  recebido: "info",
  preparando: "warn",
  pronto: "ok",
  entregue: "neutral",
  cancelado: "red",
};
const tomComanda: Record<StatusComanda, TomBadge> = {
  aberta: "ok",
  aguardando_pagamento: "gold",
  fechada: "neutral",
  cancelada: "red",
};
const tomMesa: Record<StatusMesa, TomBadge> = {
  livre: "neutral",
  ocupada: "ok",
  chamando: "red",
  aguardando_pagamento: "gold",
};

type Props =
  | { tipo: "pedido"; status: StatusPedido }
  | { tipo: "comanda"; status: StatusComanda }
  | { tipo: "mesa"; status: StatusMesa };

export function StatusBadge(props: Props) {
  if (props.tipo === "pedido") return <Badge tom={tomPedido[props.status]}>{STATUS_PEDIDO_LABEL[props.status]}</Badge>;
  if (props.tipo === "comanda") return <Badge tom={tomComanda[props.status]}>{STATUS_COMANDA_LABEL[props.status]}</Badge>;
  return <Badge tom={tomMesa[props.status]}>{STATUS_MESA_LABEL[props.status]}</Badge>;
}
