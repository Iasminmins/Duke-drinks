"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, LogOut, Maximize, Minimize, Undo2, Volume2, VolumeX } from "lucide-react";
import { Coroa } from "@/components/brand/coroa";
import { ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Mascote } from "@/components/brand/mascote";
import { avancarTicket, listarTickets, voltarTicket } from "@/services/pedidos.service";
import { useNow } from "@/hooks/useNow";
import { useSession } from "@/stores/session";
import { tocarAlerta } from "@/lib/som";
import { minutosDesde, tempoDesde } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { StatusPedido, TicketKds } from "@/types";

const COLUNAS: { status: StatusPedido; titulo: string; acao: string; cor: string }[] = [
  { status: "recebido", titulo: "Recebido", acao: "Iniciar preparo", cor: "bg-info" },
  { status: "preparando", titulo: "Preparando", acao: "Marcar pronto", cor: "bg-warn" },
  { status: "pronto", titulo: "Pronto", acao: "Retirado", cor: "bg-ok" },
];

const ATRASO_AMARELO = 10;
const ATRASO_VERMELHO = 20;

export function KdsBoard({ setor, nome }: { setor: string; nome: string }) {
  const router = useRouter();
  const sair = useSession((s) => s.sair);
  const agora = useNow(10_000);
  const relogio = useNow(1000);
  const [som, setSom] = useState(false);
  const [soAtrasados, setSoAtrasados] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const conhecidos = useRef<Set<string> | null>(null);

  const q = useQuery({
    queryKey: ["kds", setor],
    queryFn: () => listarTickets(setor),
  });

  // destaca tickets que acabaram de chegar
  useEffect(() => {
    if (!q.data) return;
    const ids = new Set(q.data.map((t) => t.pedidoId));
    if (conhecidos.current) {
      const chegaram = [...ids].filter((id) => !conhecidos.current!.has(id));
      if (chegaram.length) {
        setNovos((s) => new Set([...s, ...chegaram]));
        setTimeout(() => setNovos((s) => new Set([...s].filter((x) => !chegaram.includes(x)))), 3000);
        if (som) tocarAlerta();
      }
    }
    conhecidos.current = ids;
  }, [q.data, som]);

  useEffect(() => {
    const onFs = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const avancar = useMutation({
    mutationFn: (t: TicketKds) => avancarTicket(t.pedidoId, setor),
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const voltar = useMutation({
    mutationFn: (t: TicketKds) => voltarTicket(t.pedidoId, setor),
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const tickets = useMemo(() => {
    const lista = q.data ?? [];
    return soAtrasados ? lista.filter((t) => minutosDesde(t.criadoEm, agora) >= ATRASO_AMARELO) : lista;
  }, [q.data, soAtrasados, agora]);

  const atrasados = (q.data ?? []).filter((t) => minutosDesde(t.criadoEm, agora) >= ATRASO_AMARELO && t.status !== "pronto").length;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      {/* header fino */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-bg-soft px-4">
        <div className="flex items-center gap-2">
          <Coroa className="h-4 w-6 text-gold" />
          <span className="font-display text-2xl tracking-wide">KDS · {nome}</span>
        </div>
        <span className="hidden items-center gap-1.5 font-mono text-lg tabular-nums text-muted sm:flex">
          <Clock className="h-4 w-4" />
          {new Date(relogio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className="rounded-full bg-surface px-3 py-1 text-sm">
          <b className="text-gold">{q.data?.length ?? 0}</b> em aberto
        </span>
        {atrasados > 0 && (
          <span className="rounded-full bg-red-soft px-3 py-1 text-sm font-semibold text-[#ff6b7f]">{atrasados} atrasado(s)</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSoAtrasados((v) => !v)}
            aria-pressed={soAtrasados}
            className={cn(
              "h-10 rounded-lg border px-3 text-sm font-medium",
              soAtrasados ? "border-red bg-red text-cream" : "border-line text-muted hover:text-cream",
            )}
          >
            Só atrasados
          </button>
          <button
            onClick={() => {
              setSom((v) => !v);
              if (!som) tocarAlerta();
            }}
            aria-label={som ? "Desativar som" : "Ativar som"}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm",
              som ? "border-line text-cream" : "animate-pulse border-gold bg-gold-soft text-gold",
            )}
          >
            {som ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden md:inline">{som ? "Som ligado" : "Ativar som"}</span>
          </button>
          <button
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
            aria-label="Tela cheia"
            className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted hover:text-cream"
          >
            {telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              sair();
              router.replace("/login");
            }}
            aria-label="Sair"
            className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted hover:text-cream"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-3">
          {COLUNAS.map((col) => {
            const daColuna = tickets.filter((t) => t.status === col.status);
            return (
              <section key={col.status} className="flex min-h-0 flex-col rounded-card border border-line bg-bg-soft" aria-label={col.titulo}>
                <h2 className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
                  <span className={cn("h-2.5 w-2.5 rounded-full", col.cor)} />
                  <span className="font-display text-2xl">{col.titulo}</span>
                  <span className="ml-auto rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-semibold tabular-nums">{daColuna.length}</span>
                </h2>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                  {q.isLoading &&
                    Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-40 w-full" />)}
                  {!q.isLoading && daColuna.length === 0 && (
                    <div className="flex flex-col items-center py-10 text-center text-sm text-subtle">
                      {col.status === "recebido" ? (
                        <>
                          <Mascote className="mb-3 h-14 w-14 opacity-60" />
                          Nenhum pedido novo. Bora!
                        </>
                      ) : (
                        "Vazio"
                      )}
                    </div>
                  )}
                  {daColuna.map((t) => (
                    <OrderCard
                      key={t.pedidoId}
                      ticket={t}
                      agora={agora}
                      novo={novos.has(t.pedidoId)}
                      acao={col.acao}
                      onAvancar={() => avancar.mutate(t)}
                      onVoltar={col.status !== "recebido" ? () => voltar.mutate(t) : undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  ticket,
  agora,
  novo,
  acao,
  onAvancar,
  onVoltar,
}: {
  ticket: TicketKds;
  agora: number;
  novo: boolean;
  acao: string;
  onAvancar: () => void;
  onVoltar?: () => void;
}) {
  const min = minutosDesde(ticket.criadoEm, agora);
  const nivel = ticket.status === "pronto" ? "ok" : min >= ATRASO_VERMELHO ? "red" : min >= ATRASO_AMARELO ? "warn" : "ok";
  const timerCor = {
    ok: "bg-surface-2 text-cream",
    warn: "bg-warn text-bg",
    red: "bg-red text-cream animate-pulse",
  }[nivel];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border bg-surface",
        nivel === "red" ? "border-red" : nivel === "warn" ? "border-warn/60" : "border-line",
        novo && "animate-glow",
      )}
    >
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5">
        <span className="font-display text-4xl leading-none text-gold">M{ticket.mesaNumero}</span>
        <span className="min-w-0 truncate text-xs text-subtle">#{ticket.numero}{ticket.clienteNome ? ` · ${ticket.clienteNome}` : ""}</span>
        <span className={cn("ml-auto rounded-md px-2 py-1 font-mono text-sm font-bold tabular-nums", timerCor)}>
          {tempoDesde(ticket.criadoEm, agora)}
        </span>
      </header>
      <ul className="space-y-2 px-3 py-3">
        {ticket.itens.map((i) => (
          <li key={i.id}>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl leading-none text-cream tabular-nums">{i.quantidade}×</span>
              <span className="text-[17px] font-semibold leading-tight">{i.nome}</span>
            </div>
            {i.adicionais.length > 0 && (
              <p className="ml-8 text-sm text-info">+ {i.adicionais.map((a) => a.nome).join(", ")}</p>
            )}
            {i.observacao && (
              <p className="ml-8 mt-1 inline-block rounded bg-gold px-2 py-0.5 text-sm font-bold text-bg">⚠ {i.observacao}</p>
            )}
          </li>
        ))}
      </ul>
      <footer className="flex gap-2 border-t border-line p-2">
        {onVoltar && (
          <button onClick={onVoltar} aria-label="Voltar etapa" className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-cream">
            <Undo2 className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={onAvancar}
          className={cn(
            "h-14 flex-1 rounded-lg text-base font-bold transition-transform active:scale-[0.98]",
            ticket.status === "recebido" && "bg-info text-bg",
            ticket.status === "preparando" && "bg-ok text-bg",
            ticket.status === "pronto" && "bg-surface-2 text-cream",
          )}
        >
          {acao}
        </button>
      </footer>
    </article>
  );
}
