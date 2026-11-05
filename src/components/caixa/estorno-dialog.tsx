"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { estornarPagamento } from "@/services/caixa.service";
import { useSession } from "@/stores/session";
import { FORMA_LABEL } from "@/lib/labels";
import { formatBRL } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import type { Pagamento } from "@/types";

export function EstornoDialog({ pagamento, onClose }: { pagamento: Pagamento | null; onClose: () => void }) {
  const usuario = useSession((s) => s.usuario)!;
  const [motivo, setMotivo] = useState("");
  const m = useMutation({
    mutationFn: () => estornarPagamento(pagamento!.id, motivo, usuario.id),
    onSuccess: () => {
      toast.success("Pagamento estornado");
      setMotivo("");
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const curto = motivo.trim().length < 5;

  return (
    <Dialog
      open={!!pagamento}
      onClose={onClose}
      titulo="Estornar pagamento"
      descricao={pagamento ? `${FORMA_LABEL[pagamento.forma]} · ${formatBRL(pagamento.valor)}. O estorno fica registrado com seu usuário.` : undefined}
      largura="sm"
      rodape={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose}>Voltar</Button>
          <Button variant="danger" block disabled={curto} loading={m.isPending} onClick={() => m.mutate()}>Estornar</Button>
        </div>
      }
    >
      <Field label="Motivo (obrigatório)" htmlFor="motivo" dica="Ex.: valor lançado errado, forma de pagamento trocada.">
        <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} />
      </Field>
    </Dialog>
  );
}
