"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BellOff, CheckCheck, KeyRound, Pencil, Phone, Plus, RotateCcw, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonLista } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClienteDialog } from "@/components/garcom/cliente-dialog";
import { listarMesasComStatus, abrirComanda } from "@/services/mesas.service";
import { atenderChamado, atualizarCliente, cancelarComanda, getComanda, reabrirComanda } from "@/services/comandas.service";
import { cancelarItem, marcarEntregue } from "@/services/pedidos.service";
import { useSession } from "@/stores/session";
import { formatBRL, formatarCelular, formatHora, tempoDesde } from "@/lib/format";
import { totalItem } from "@/lib/calc";
import { mensagemErro } from "@/lib/errors";
import { cn } from "@/lib/utils";

export default function MesaDetalhe() {
  const { numero } = useParams<{ numero: string }>();
  const router = useRouter();
  const usuario = useSession((s) => s.usuario)!;
  const mesasQ = useQuery({ queryKey: ["mesas-status"], queryFn: listarMesasComStatus });
  const mesa = mesasQ.data?.find((m) => m.numero === Number(numero));

  // a mesa pode ter várias comandas (uma por pessoa); `selId` escolhe qual está aberta na tela
  const [selId, setSelId] = useState<string | null>(null);
  const comandas = mesa?.comandas ?? [];
  const cmd = comandas.find((c) => c.id === selId) ?? comandas[0];
  const comandaId = cmd?.id;
  const comandaQ = useQuery({ queryKey: ["comanda", comandaId], queryFn: () => getComanda(comandaId!), enabled: !!comandaId });

  const [dialogo, setDialogo] = useState<null | "abrir" | "editar">(null);
  const [itemParaCancelar, setItemParaCancelar] = useState<{ p: string; i: string; nome: string; status: string } | null>(null);
  const [cancelandoComanda, setCancelandoComanda] = useState(false);

  const erro = (e: unknown) => toast.error(mensagemErro(e));
  const abrir = useMutation({
    mutationFn: (v: { nome: string; celular: string }) => abrirComanda(mesa!.id, usuario.id, v),
    onSuccess: (c) => {
      setSelId(c.id);
      setDialogo(null);
      toast.success(`Comanda aberta${c.clienteNome ? ` para ${c.clienteNome}` : ""}. Código do cliente: ${c.codigo}`, { duration: 7000 });
    },
    onError: erro,
  });
  const editar = useMutation({
    mutationFn: (v: { nome: string; celular: string }) => atualizarCliente(comandaId!, v.nome, v.celular),
    onSuccess: () => {
      setDialogo(null);
      toast.success("Dados do cliente atualizados");
    },
    onError: erro,
  });
  const atender = useMutation({ mutationFn: () => atenderChamado(comandaId!), onSuccess: () => toast.success("Chamado atendido"), onError: erro });
  const entregar = useMutation({ mutationFn: marcarEntregue, onSuccess: () => toast.success("Marcado como entregue"), onError: erro });
  const reabrir = useMutation({ mutationFn: () => reabrirComanda(comandaId!), onSuccess: () => toast.success("Comanda reaberta para pedidos"), onError: erro });
  const cancelar = useMutation({
    mutationFn: (v: { p: string; i: string }) => cancelarItem(v.p, v.i),
    onSuccess: () => {
      toast.success("Item cancelado");
      setItemParaCancelar(null);
    },
    onError: erro,
  });
  const cancelarCmd = useMutation({
    mutationFn: () => cancelarComanda(comandaId!, usuario.id),
    onSuccess: () => {
      toast.success("Comanda cancelada");
      setCancelandoComanda(false);
      setSelId(null);
      if (comandas.length <= 1) router.push("/garcom");
    },
    onError: erro,
  });

  if (mesasQ.isLoading) return <SkeletonLista />;
  if (!mesa) return <EmptyState titulo="Mesa não encontrada" acao={<Button onClick={() => router.push("/garcom")}>Voltar</Button>} />;

  const c = comandaQ.data;
  const pedidosComPronto = c?.pedidos.filter((p) => p.itens.some((i) => i.status === "pronto")) ?? [];
  const rotulo = (x: { clienteNome?: string }, idx: number) => x.clienteNome ?? `Comanda ${idx + 1}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/garcom" aria-label="Voltar para mesas" className="grid h-11 w-11 place-items-center rounded-full border border-line">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-4xl leading-none">Mesa {mesa.numero}</h1>
          <p className="text-sm text-muted">
            {mesa.lugares} lugares
            {comandas.length > 1 && ` · ${comandas.length} comandas · total ${formatBRL(mesa.totalParcial ?? 0)}`}
          </p>
        </div>
        <div className="ml-auto"><StatusBadge tipo="mesa" status={mesa.status} /></div>
      </div>

      {!cmd ? (
        <Card className="p-6 text-center">
          <p className="font-display text-2xl">Mesa livre</p>
          <p className="mt-1 text-sm text-muted">Abra a comanda para liberar os pedidos pelo QR code. O sistema gera um código de 4 dígitos para o cliente.</p>
          <Button size="lg" block className="mt-5" onClick={() => setDialogo("abrir")}>
            Abrir comanda
          </Button>
        </Card>
      ) : (
        <>
          {/* uma aba por comanda da mesa + botão para abrir outra (comanda individual) */}
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {comandas.map((x, idx) => (
              <button
                key={x.id}
                onClick={() => setSelId(x.id)}
                aria-pressed={x.id === cmd.id}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm",
                  x.id === cmd.id ? "border-gold bg-gold font-semibold text-bg" : "border-line text-muted",
                )}
              >
                {x.chamandoGarcom && x.status === "aberta" && <span className="h-2 w-2 rounded-full bg-red" />}
                {rotulo(x, idx)}
              </button>
            ))}
            <button
              onClick={() => setDialogo("abrir")}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-gold/60 px-4 text-sm text-gold"
            >
              <Plus className="h-4 w-4" /> Nova comanda
            </button>
          </div>

          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-gold-soft text-gold"><KeyRound className="h-6 w-6" /></span>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted">Código para o cliente</p>
                <p className="font-display text-4xl leading-none tracking-[0.3em] text-gold">{cmd.codigo}</p>
              </div>
              <div className="text-right text-xs text-muted">
                Aberta {formatHora(cmd.abertaEm)}
                <br />há {tempoDesde(cmd.abertaEm)}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-line pt-3 text-sm">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-muted" />
                  {cmd.clienteNome ? <b className="truncate">{cmd.clienteNome}</b> : <span className="text-subtle">Sem nome. Toque em Editar para completar.</span>}
                </p>
                <p className="flex items-center gap-2 text-muted">
                  <Phone className="h-4 w-4 shrink-0" />
                  {cmd.clienteCelular ? formatarCelular(cmd.clienteCelular) : <span className="text-subtle">Sem celular</span>}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setDialogo("editar")}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </div>
          </Card>

          {cmd.chamandoGarcom && (
            <div className="flex items-center gap-3 rounded-card border border-red bg-red-soft p-3">
              <span className="flex-1 text-sm font-semibold">Cliente está chamando</span>
              <Button size="sm" variant="danger" loading={atender.isPending} onClick={() => atender.mutate()}>
                <BellOff className="h-4 w-4" /> Atendido
              </Button>
            </div>
          )}

          {cmd.status === "aguardando_pagamento" && (
            <div className="flex items-center gap-3 rounded-card border border-gold bg-gold-soft p-3">
              <span className="flex-1 text-sm"><b>Conta solicitada.</b> Pagamento no caixa.</span>
              <Button size="sm" variant="secondary" loading={reabrir.isPending} onClick={() => reabrir.mutate()}>
                <RotateCcw className="h-4 w-4" /> Reabrir
              </Button>
            </div>
          )}

          {pedidosComPronto.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-card border border-ok bg-ok-soft p-3">
              <CheckCheck className="h-5 w-5 shrink-0 text-ok" />
              <span className="flex-1 text-sm">
                <b>Pronto para servir:</b>{" "}
                {p.itens.filter((i) => i.status === "pronto").map((i) => `${i.quantidade}× ${i.nome}`).join(", ")}
              </span>
              <Button size="sm" variant="success" onClick={() => entregar.mutate(p.id)}>Entregue</Button>
            </div>
          ))}

          <div className="grid grid-cols-1 gap-2">
            <Button
              size="lg"
              disabled={cmd.status !== "aberta"}
              onClick={() => router.push(`/garcom/mesa/${mesa.numero}/pedido?c=${cmd.id}`)}
            >
              <Plus className="h-5 w-5" /> Lançar pedido{cmd.clienteNome ? ` · ${cmd.clienteNome}` : ""}
            </Button>
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-display text-2xl">Comanda{cmd.clienteNome ? ` de ${cmd.clienteNome}` : ""}</h2>
              {c && <span className="font-display text-2xl text-gold">{formatBRL(c.totais.total)}</span>}
            </div>
            {comandaQ.isLoading && <div className="p-4"><SkeletonLista linhas={3} /></div>}
            {c && c.pedidos.length === 0 && <p className="p-6 text-center text-sm text-subtle">Nenhum pedido ainda.</p>}
            {c?.pedidos.map((p) => (
              <div key={p.id} className="border-b border-line last:border-0">
                <p className="flex items-center gap-2 bg-bg-soft px-4 py-1.5 text-xs text-subtle">
                  Pedido #{p.numero} · {formatHora(p.criadoEm)} · {p.origem === "cliente" ? "pelo QR" : "pelo garçom"}
                </p>
                <ul className="divide-y divide-line">
                  {p.itens.map((i) => (
                    <li key={i.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 w-7 shrink-0 text-sm font-bold tabular-nums">{i.quantidade}×</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className={i.status === "cancelado" ? "text-sm text-subtle line-through" : "text-sm font-medium"}>{i.nome}</p>
                          <span className="shrink-0 text-sm tabular-nums text-muted">{formatBRL(totalItem(i))}</span>
                        </div>
                        {i.adicionais.length > 0 && <p className="text-xs text-muted">+ {i.adicionais.map((a) => a.nome).join(", ")}</p>}
                        {i.observacao && <p className="text-xs text-gold">“{i.observacao}”</p>}
                        <div className="mt-1.5"><StatusBadge tipo="pedido" status={i.status} /></div>
                      </div>
                      {(i.status === "recebido" || i.status === "preparando" || i.status === "pronto") && (
                        <button
                          aria-label={`Cancelar ${i.nome}`}
                          onClick={() => setItemParaCancelar({ p: p.id, i: i.id, nome: `${i.quantidade}× ${i.nome}`, status: i.status })}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 text-xs text-muted hover:border-red hover:text-[#ff6b7f]"
                        >
                          <Trash2 className="h-4 w-4" /> Cancelar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>

          {c && cmd.status === "aberta" && c.pedidos.every((p) => p.itens.every((i) => i.status === "cancelado")) && (
            <Button variant="secondary" block onClick={() => setCancelandoComanda(true)}>
              <Trash2 className="h-4 w-4" /> Cancelar comanda (aberta por engano)
            </Button>
          )}
        </>
      )}

      <ClienteDialog
        open={dialogo === "abrir"}
        onClose={() => setDialogo(null)}
        titulo={cmd ? "Nova comanda nesta mesa" : "Abrir comanda"}
        descricao="Comanda individual: cada pessoa pede e paga a sua. Nome e celular do cliente são obrigatórios."
        confirmar="Abrir comanda"
        loading={abrir.isPending}
        onSalvar={(nome, celular) => abrir.mutate({ nome, celular })}
      />
      <ClienteDialog
        open={dialogo === "editar"}
        onClose={() => setDialogo(null)}
        titulo="Dados do cliente"
        inicial={{ nome: cmd?.clienteNome, celular: cmd?.clienteCelular }}
        confirmar="Salvar"
        loading={editar.isPending}
        onSalvar={(nome, celular) => editar.mutate({ nome, celular })}
      />

      <ConfirmDialog
        open={!!itemParaCancelar}
        onClose={() => setItemParaCancelar(null)}
        onConfirm={() => itemParaCancelar && cancelar.mutate({ p: itemParaCancelar.p, i: itemParaCancelar.i })}
        loading={cancelar.isPending}
        perigo
        titulo="Cancelar este item?"
        descricao={
          itemParaCancelar
            ? `${itemParaCancelar.nome} sai da conta.` +
              (itemParaCancelar.status !== "recebido" ? " Ele já está em preparo ou pronto: avise a cozinha/bar." : "")
            : undefined
        }
        confirmar="Cancelar item"
      />
      <ConfirmDialog
        open={cancelandoComanda}
        onClose={() => setCancelandoComanda(false)}
        onConfirm={() => cancelarCmd.mutate()}
        loading={cancelarCmd.isPending}
        perigo
        titulo="Cancelar esta comanda?"
        descricao={comandas.length > 1 ? "Só esta comanda é cancelada. As outras da mesa continuam abertas." : "A comanda é cancelada e a mesa volta a ficar livre."}
        confirmar="Cancelar comanda"
      />
    </div>
  );
}
