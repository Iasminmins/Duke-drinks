"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, QrCode } from "lucide-react";
import { listarMesasComStatus } from "@/services/mesas.service";
import { useSession } from "@/stores/session";
import type { MesaComStatus } from "@/types";

function nota(m: MesaComStatus) {
  const c = m.comanda;
  if (!c) return "Mesa livre · o garçom ainda não abriu a comanda";
  if (m.comandas.length > 1) {
    const abertas = m.comandas.filter((x) => x.status === "aberta");
    return `${m.comandas.length} comandas · códigos ${abertas.map((x) => x.codigo).join(", ") || "—"}`;
  }
  if (c.status === "aguardando_pagamento") return "Conta pedida · aguardando o caixa";
  return `Comanda${c.clienteNome ? ` de ${c.clienteNome}` : ""} aberta · código ${c.codigo}`;
}

function Cartao({ numero, texto, ativa }: { numero: number; texto: string; ativa: boolean }) {
  return (
    <Link
      href={`/m/${numero}`}
      target="_blank"
      className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition-colors hover:border-gold/50"
    >
      <span className={`grid h-12 w-12 place-items-center rounded-lg ${ativa ? "bg-gold text-bg" : "bg-surface-2 text-muted"}`}>
        <QrCode className="h-6 w-6" />
      </span>
      <span className="flex-1">
        <span className="block font-display text-2xl leading-none">Mesa {numero}</span>
        <span className="mt-1 block text-xs text-muted">{texto}</span>
      </span>
      <ArrowUpRight className="h-5 w-5 text-subtle group-hover:text-gold" />
    </Link>
  );
}

/**
 * Atalhos para o cardápio do cliente.
 * Sem login: só os links. Com login de garçom/caixa/admin: estado real das mesas e códigos.
 */
export function MesasDemo() {
  const papel = useSession((s) => s.usuario?.papel);
  const veEstado = papel === "garcom" || papel === "caixa" || papel === "admin";
  const q = useQuery({ queryKey: ["mesas-status"], queryFn: listarMesasComStatus, enabled: veEstado });

  if (!veEstado || q.isError) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <Cartao key={n} numero={n} texto="Abrir o cardápio desta mesa" ativa={false} />
        ))}
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-card border border-line bg-surface" />
        ))}
      </div>
    );
  }

  const mesas = q.data ?? [];
  const lista = [...mesas.filter((m) => m.comanda), ...mesas.filter((m) => !m.comanda).slice(0, 2)];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {lista.map((m) => (
        <Cartao key={m.id} numero={m.numero} texto={nota(m)} ativa={!!m.comanda} />
      ))}
    </div>
  );
}
