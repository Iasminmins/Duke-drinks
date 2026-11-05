"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonLista } from "@/components/ui/skeleton";
import { atenderChamado } from "@/services/comandas.service";
import { notificacoesGarcom } from "@/services/pedidos.service";
import { useNow } from "@/hooks/useNow";
import { tempoDesde } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { cn } from "@/lib/utils";

export default function ChamadosPage() {
  const agora = useNow();
  const q = useQuery({ queryKey: ["notificacoes"], queryFn: notificacoesGarcom });
  const atender = useMutation({
    mutationFn: atenderChamado,
    onSuccess: () => toast.success("Chamado atendido"),
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const lista = (q.data ?? []).filter((n) => n.tipo !== "pronto");

  return (
    <div>
      <h1 className="font-display text-4xl">Chamados</h1>
      <p className="text-sm text-muted">Mesas chamando e contas solicitadas.</p>
      <div className="mt-5 space-y-2.5">
        {q.isLoading && <SkeletonLista />}
        {q.data && lista.length === 0 && <EmptyState titulo="Salão tranquilo" descricao="Nenhuma mesa chamando agora." />}
        {lista.map((n) => (
          <div
            key={n.id}
            className={cn("flex items-center gap-3 rounded-card border bg-surface p-3", n.tipo === "chamado" ? "border-red" : "border-gold/60")}
          >
            <Link
              href={`/garcom/mesa/${n.mesaNumero}`}
              className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-lg font-display text-3xl",
                n.tipo === "chamado" ? "bg-red-soft text-[#ff6b7f]" : "bg-gold-soft text-gold",
              )}
            >
              {n.mesaNumero}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {n.tipo === "chamado" ? <BellRing className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                {n.mensagem}
              </p>
              <p className="text-xs text-subtle">
                {n.tipo === "chamado" ? `há ${tempoDesde(n.criadoEm, agora)}` : "Encaminhe o cliente ao caixa"}
              </p>
            </div>
            {n.tipo === "chamado" ? (
              <Button size="sm" variant="danger" onClick={() => atender.mutate(n.refId)}>Atendido</Button>
            ) : (
              <Link href={`/garcom/mesa/${n.mesaNumero}`} className="rounded-lg border border-line px-3 py-2 text-sm">Ver</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
