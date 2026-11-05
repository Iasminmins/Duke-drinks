"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonLista } from "@/components/ui/skeleton";
import { marcarEntregue, notificacoesGarcom } from "@/services/pedidos.service";
import { useNow } from "@/hooks/useNow";
import { tempoDesde } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";

export default function ProntosPage() {
  const agora = useNow();
  const q = useQuery({ queryKey: ["notificacoes"], queryFn: notificacoesGarcom });
  const entregar = useMutation({
    mutationFn: marcarEntregue,
    onSuccess: () => toast.success("Entregue na mesa"),
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const prontos = (q.data ?? []).filter((n) => n.tipo === "pronto");

  return (
    <div>
      <h1 className="font-display text-4xl">Pedidos prontos</h1>
      <p className="text-sm text-muted">Retire no balcão e confirme a entrega.</p>
      <div className="mt-5 space-y-2.5">
        {q.isLoading && <SkeletonLista />}
        {q.data && prontos.length === 0 && <EmptyState titulo="Tudo entregue" descricao="Quando a cozinha ou o bar marcar algo como pronto, aparece aqui." />}
        {prontos.map((n) => (
          <div key={n.id} className="flex items-center gap-3 rounded-card border border-ok/50 bg-surface p-3">
            <Link href={`/garcom/mesa/${n.mesaNumero}`} className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-ok-soft font-display text-3xl text-ok">
              {n.mesaNumero}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{n.mensagem}</p>
              <p className="text-xs text-subtle">pronto há {tempoDesde(n.criadoEm, agora)}</p>
            </div>
            <Button variant="success" size="sm" onClick={() => entregar.mutate(n.refId)}>
              <CheckCheck className="h-4 w-4" /> Entregue
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
