"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, Plus, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { ClienteDialog } from "@/components/garcom/cliente-dialog";
import { abrirComanda, listarCartoes, listarComandasAtivas, listarMesas } from "@/services/mesas.service";
import { useNow } from "@/hooks/useNow";
import { formatBRL, tempoDesde } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { ComandaDetalhada } from "@/types";

type Filtro = "todas" | "chamando" | "conta";
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "chamando", label: "Chamando" },
  { id: "conta", label: "Pediu a conta" },
];

const chamando = (c: ComandaDetalhada) => c.chamandoGarcom && c.status === "aberta";
const conta = (c: ComandaDetalhada) => c.status === "aguardando_pagamento";
const peso = (c: ComandaDetalhada) => (chamando(c) ? 0 : conta(c) ? 1 : 2);

export default function ComandasPage() {
  const router = useRouter();
  const agora = useNow(30_000);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [abrir, setAbrir] = useState(false);
  const q = useQuery({ queryKey: ["comandas-ativas"], queryFn: listarComandasAtivas });
  const mesasQ = useQuery({ queryKey: ["mesas"], queryFn: listarMesas });
  const cartoesQ = useQuery({ queryKey: ["cartoes"], queryFn: listarCartoes });

  const nova = useMutation({
    mutationFn: abrirComanda,
    onSuccess: (c) => {
      setAbrir(false);
      toast.success(
        (cartoesQ.data ?? []).length
          ? `Comanda ${c.numero} aberta. Entregue o cartão ${c.numero} ao cliente.`
          : `Comanda ${c.numero} aberta. Mostre o QR para o cliente.`,
      );
      router.push(`/garcom/comanda/${c.numero}`);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const todas = q.data ?? [];
  const termo = busca.trim().toLowerCase();
  const lista = todas
    .filter((c) => (filtro === "chamando" ? chamando(c) : filtro === "conta" ? conta(c) : true))
    .filter((c) => !termo || String(c.numero) === termo.replace(/^#/, "") || (c.clienteNome ?? "").toLowerCase().includes(termo))
    .sort((a, b) => peso(a) - peso(b) || a.numero - b.numero);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Comandas</h1>
          <p className="text-sm text-muted">{q.data ? `${todas.length} em andamento` : " "}</p>
        </div>
        <Button onClick={() => setAbrir(true)}>
          <Plus className="h-5 w-5" /> Nova comanda
        </Button>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por número ou nome"
          aria-label="Buscar comanda por número ou nome"
          className="pl-9"
        />
      </div>

      <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((f) => {
          const n = f.id === "chamando" ? todas.filter(chamando).length : f.id === "conta" ? todas.filter(conta).length : 0;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm",
                filtro === f.id ? "border-gold bg-gold font-semibold text-bg" : "border-line text-muted",
              )}
            >
              {f.label}
              {n > 0 && <span className="tabular-nums opacity-70">{n}</span>}
            </button>
          );
        })}
      </div>

      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {q.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[76px]" />)}
        {lista.map((c) => (
          <li key={c.id}>
            <Link
              href={`/garcom/comanda/${c.numero}`}
              className={cn(
                "flex items-center gap-3 rounded-card border-2 p-3 transition-transform active:scale-[0.98]",
                chamando(c) ? "animate-pulse border-red bg-red-soft" : conta(c) ? "border-gold bg-gold-soft" : "border-ok/40 bg-ok-soft",
              )}
            >
              <span className="grid h-14 min-w-14 place-items-center rounded-lg bg-bg px-2 font-display text-3xl leading-none text-gold">
                {c.numero}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate font-semibold">{c.clienteNome ?? "Sem nome"}</span>
                <span className="block text-xs text-muted">
                  {tempoDesde(c.abertaEm, agora)}
                  {c.mesaNumero ? ` · Mesa ${c.mesaNumero}` : ""}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="font-semibold tabular-nums">{formatBRL(c.totais.total)}</span>
                {chamando(c) && <BellRing className="h-4 w-4 text-danger-fg" />}
                {conta(c) && <Receipt className="h-4 w-4 text-gold" />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {q.data && lista.length === 0 && (
        <EmptyState
          compacto
          titulo={todas.length === 0 ? "Nenhuma comanda aberta" : "Nada encontrado"}
          descricao={todas.length === 0 ? "Toque em Nova comanda quando chegar o primeiro cliente." : "Confira o número ou o nome."}
        />
      )}

      <ClienteDialog
        open={abrir}
        onClose={() => setAbrir(false)}
        titulo="Nova comanda"
        descricao="Cada pessoa tem a sua comanda individual. Depois de abrir, mostre o QR para o cliente escanear."
        confirmar="Abrir comanda"
        loading={nova.isPending}
        mesas={mesasQ.data ?? []}
        cartoes={cartoesQ.data ?? []}
        onSalvar={(nome, celular, o) => nova.mutate({ nome, celular, mesaId: o.mesaId, numero: o.numero })}
      />
    </div>
  );
}
