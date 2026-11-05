"use client";

import { Dialog } from "./dialog";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  titulo,
  descricao,
  confirmar = "Confirmar",
  perigo,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  descricao?: string;
  confirmar?: string;
  perigo?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titulo={titulo}
      descricao={descricao}
      largura="sm"
      rodape={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose}>
            Voltar
          </Button>
          <Button variant={perigo ? "danger" : "primary"} block loading={loading} onClick={onConfirm}>
            {confirmar}
          </Button>
        </div>
      }
    >
      <span />
    </Dialog>
  );
}
