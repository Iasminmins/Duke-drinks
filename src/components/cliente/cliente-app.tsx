"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BellRing, ClipboardList, Lock, Minus, Plus, Receipt, ShoppingBag, Trash2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Coroa } from "@/components/brand/coroa";
import { Mascote } from "@/components/brand/mascote";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonLista } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { CardapioLista } from "./cardapio-lista";
import { ProdutoSheet } from "./produto-sheet";
import { getCardapio } from "@/services/cardapio.service";
import { entrarNaComanda, getMesaPublica } from "@/services/mesas.service";
import { getEstabelecimento } from "@/services/config.service";
import { chamarGarcom, getComanda, identificarCliente, pedirConta } from "@/services/comandas.service";
import { criarPedido } from "@/services/pedidos.service";
import { precoItemCarrinho, qtdCarrinho, totalCarrinho, useCart } from "@/stores/cart";
import { formatBRL, formatHora, mascaraCelular } from "@/lib/format";
import { totalItem } from "@/lib/calc";
import { mensagemErro } from "@/lib/errors";
import { ServiceError } from "@/services/_base";
import { cn } from "@/lib/utils";
import type { Pedido, Produto } from "@/types";

type Vista = "cardapio" | "carrinho" | "comanda" | "enviado";

/** a comanda do cliente neste celular: guardada por mesa (a mesa pode ter várias comandas) */
type SessaoComanda = { id: string; codigo: string };
const chaveSessao = (mesa: number) => `duke:comanda:${mesa}`;
function lerSessao(mesa: number): SessaoComanda | null {
  try {
    const raw = sessionStorage.getItem(chaveSessao(mesa));
    return raw ? (JSON.parse(raw) as SessaoComanda) : null;
  } catch {
    return null;
  }
}
function gravarSessao(mesa: number, s: SessaoComanda | null) {
  try {
    if (s) sessionStorage.setItem(chaveSessao(mesa), JSON.stringify(s));
    else sessionStorage.removeItem(chaveSessao(mesa));
  } catch {}
}

export function ClienteApp({ mesa }: { mesa: number }) {
  const [vista, setVista] = useState<Vista>("cardapio");
  const [produto, setProduto] = useState<Produto | null>(null);
  const [verSemLiberar, setVerSemLiberar] = useState(false);
  const [pedirCodigo, setPedirCodigo] = useState(false);
  const [acaoPosCodigo, setAcaoPosCodigo] = useState<"enviar" | "comanda">("enviar");
  const [sessao, setSessao] = useState<SessaoComanda | null>(null);
  const [confirmaConta, setConfirmaConta] = useState(false);
  const [ultimoPedido, setUltimoPedido] = useState<Pedido | null>(null);

  const cart = useCart();
  useEffect(() => {
    cart.setMesa(mesa);
  }, [mesa]); // eslint-disable-line react-hooks/exhaustive-deps

  const mesaQ = useQuery({ queryKey: ["mesa-publica", mesa], queryFn: () => getMesaPublica(mesa), retry: false });
  const cardapioQ = useQuery({ queryKey: ["cardapio"], queryFn: getCardapio });
  const estQ = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });
  const guardar = (nova: SessaoComanda | null) => {
    setSessao(nova);
    gravarSessao(mesa, nova);
  };
  useEffect(() => {
    setSessao(lerSessao(mesa));
  }, [mesa]);
  const comandaId = sessao?.id ?? null;
  const comandaQ = useQuery({
    queryKey: ["comanda", comandaId],
    queryFn: () => getComanda(comandaId!, sessao?.codigo),
    enabled: !!comandaId,
  });

  const comanda = comandaQ.data;
  const mesaLiberada = (mesaQ.data?.comandasAbertas ?? 0) > 0 || !!comandaId;
  /** com comanda identificada vale o estado dela; sem, vale se a mesa tem alguma aberta */
  const aberta = comandaId ? comanda?.status === "aberta" : (mesaQ.data?.comandasAbertas ?? 0) > 0;
  const contaPedida = comanda?.status === "aguardando_pagamento";

  // comanda guardada que não existe mais ou cujo código não vale mais: esquece e volta a pedir o código
  const erroComanda = comandaQ.error;
  useEffect(() => {
    if (!sessao || !(erroComanda instanceof ServiceError)) return;
    const invalida =
      erroComanda.code === "NAO_ENCONTRADO" || (erroComanda.code === "PROIBIDO" && /código/i.test(erroComanda.message));
    if (invalida) {
      setSessao(null);
      gravarSessao(mesa, null);
    }
  }, [erroComanda, sessao, mesa]);

  // comanda já paga/cancelada: este celular deixa de estar vinculado a ela
  const statusComanda = comanda?.status;
  useEffect(() => {
    if (statusComanda === "fechada" || statusComanda === "cancelada") {
      setSessao(null);
      gravarSessao(mesa, null);
      setVista("cardapio");
    }
  }, [statusComanda, mesa]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [vista]);

  const enviar = useMutation({
    mutationFn: (alvo: SessaoComanda) =>
      criarPedido({
        comandaId: alvo.id,
        origem: "cliente",
        codigo: alvo.codigo,
        itens: cart.itens.map((i) => ({
          produtoId: i.produto.id,
          quantidade: i.quantidade,
          adicionaisIds: i.adicionais.map((a) => a.id),
          observacao: i.observacao,
        })),
      }),
    onSuccess: (pedido) => {
      cart.limpar();
      setUltimoPedido(pedido);
      setVista("enviado");
    },
    onError: (e) => {
      const msg = mensagemErro(e);
      if (msg.toLowerCase().includes("código")) {
        guardar(null);
        setAcaoPosCodigo("enviar");
        setPedirCodigo(true);
      }
      toast.error(msg);
    },
  });

  const chamar = useMutation({
    mutationFn: () => chamarGarcom(comandaId!, sessao?.codigo),
    onSuccess: () => toast.success("Garçom chamado! Já já alguém passa na sua mesa."),
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const conta = useMutation({
    mutationFn: () => pedirConta(comandaId!, sessao?.codigo),
    onSuccess: () => {
      setConfirmaConta(false);
      toast.success("Conta solicitada. O pagamento é feito no caixa.");
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  function tentarEnviar() {
    if (!mesaLiberada) {
      toast.error("A mesa ainda não foi liberada pelo garçom.");
      return;
    }
    if (!sessao) {
      setAcaoPosCodigo("enviar");
      setPedirCodigo(true);
      return;
    }
    if (!aberta) {
      toast.error("A conta já foi solicitada. Para pedir mais, chame o garçom.");
      return;
    }
    enviar.mutate(sessao);
  }

  function abrirMinhaComanda() {
    if (sessao) setVista("comanda");
    else {
      setAcaoPosCodigo("comanda");
      setPedirCodigo(true);
    }
  }

  // ---------- estados de carregamento / erro
  if (mesaQ.isError) {
    return (
      <Moldura>
        <div className="flex min-h-dvh flex-col items-center justify-center px-6">
          <Logo />
          <EmptyState
            className="pt-8"
            titulo="Mesa não encontrada"
            descricao="Esse QR code não corresponde a uma mesa ativa. Chame alguém da equipe que a gente resolve."
          />
        </div>
      </Moldura>
    );
  }
  if (mesaQ.isLoading || cardapioQ.isLoading) {
    return (
      <Moldura>
        <div className="space-y-4 px-4 pt-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-11 w-full rounded-full" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
          </div>
          <SkeletonLista linhas={5} />
        </div>
      </Moldura>
    );
  }
  if (cardapioQ.isError) return <Moldura><ErrorState onRetry={() => cardapioQ.refetch()} /></Moldura>;

  if (!mesaLiberada && !verSemLiberar) {
    return (
      <Moldura>
        <MesaNaoLiberada mesa={mesa} onVer={() => setVerSemLiberar(true)} />
      </Moldura>
    );
  }

  const qtd = qtdCarrinho(cart.itens);
  const total = totalCarrinho(cart.itens);
  const cardapio = cardapioQ.data!;

  return (
    <Moldura>
      {/* HEADER */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/95 px-4 backdrop-blur">
        {vista !== "cardapio" ? (
          <button onClick={() => setVista("cardapio")} aria-label="Voltar ao cardápio" className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-surface">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <Logo compacto />
        )}
        <div className="leading-tight">
          <p className="text-[11px] uppercase tracking-widest text-subtle">Você está na</p>
          <p className="font-display text-xl leading-none text-gold">Mesa {mesa}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {!!sessao && aberta && (
            <button
              onClick={() => chamar.mutate()}
              disabled={chamar.isPending}
              aria-label="Chamar garçom"
              className="grid h-11 w-11 place-items-center rounded-full text-cream hover:bg-surface disabled:opacity-50"
            >
              <BellRing className="h-5 w-5" />
            </button>
          )}
          {mesaLiberada && (
            <button
              onClick={abrirMinhaComanda}
              aria-label="Minha comanda"
              className="grid h-11 w-11 place-items-center rounded-full text-cream hover:bg-surface"
            >
              <ClipboardList className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {vista === "cardapio" && (
        <>
          <div className="px-4 pb-4 pt-5">
            <div className="flex items-center gap-2 text-gold">
              <Coroa className="h-3 w-5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em]">Powered by Brahma</span>
            </div>
            <p className="mt-1.5 font-display text-[28px] leading-[1.05] text-cream">
              {estQ.data?.mensagemTopo ?? "Boa cerveja, bons amigos e sempre Duke!"}
            </p>
          </div>

          {contaPedida && (
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-card border border-gold/40 bg-gold-soft p-3 text-sm">
              <Receipt className="h-5 w-5 shrink-0 text-gold" />
              <span>Conta solicitada. <b>Pagamento no caixa.</b> Para pedir mais, chame o garçom.</span>
            </div>
          )}
          {!mesaLiberada && (
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-card border border-line bg-surface p-3 text-sm text-muted">
              <Lock className="h-5 w-5 shrink-0" />
              Você está vendo o cardápio. Para pedir, peça ao garçom para abrir a mesa.
            </div>
          )}
          {mesaLiberada && !sessao && (
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-card border border-line bg-surface p-3 text-sm text-muted">
              <Lock className="h-5 w-5 shrink-0" />
              <span>Ao fazer o pedido, você informa o <b className="text-cream">código da sua comanda</b>. Peça ao garçom.</span>
            </div>
          )}
          {!!sessao && comanda?.clienteNome && (
            <div className="mx-4 mb-4 rounded-card border border-line bg-surface px-3 py-2 text-sm text-muted">
              Comanda de <b className="text-cream">{comanda.clienteNome}</b>
            </div>
          )}

          <CardapioLista
            categorias={cardapio.categorias}
            produtos={cardapio.produtos}
            onSelecionar={setProduto}
            topoSticky={64}
          />
        </>
      )}

      {vista === "carrinho" && (
        <Carrinho
          onVoltar={() => setVista("cardapio")}
          onEnviar={tentarEnviar}
          enviando={enviar.isPending}
          podeEnviar={aberta}
        />
      )}

      {vista === "comanda" && (
        <MinhaComanda
          carregando={comandaQ.isLoading}
          comanda={comanda}
          podePedirConta={aberta}
          onPedirConta={() => setConfirmaConta(true)}
          onChamar={() => chamar.mutate()}
          chamando={chamar.isPending}
        />
      )}

      {vista === "enviado" && ultimoPedido && (
        <PedidoEnviado pedido={ultimoPedido} onCardapio={() => setVista("cardapio")} onComanda={() => setVista("comanda")} />
      )}

      {/* BARRA DO CARRINHO */}
      {vista === "cardapio" && qtd > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setVista("carrinho")}
            className="flex h-16 w-full items-center gap-3 rounded-2xl bg-gold px-4 text-bg shadow-[0_10px_40px_#f5b80040] active:scale-[0.99]"
          >
            <span key={cart.pulso} className="relative grid h-10 w-10 animate-pop place-items-center rounded-full bg-bg text-gold">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red px-1 text-[11px] font-bold text-cream">
                {qtd}
              </span>
            </span>
            <span className="text-base font-bold">Ver pedido</span>
            <span className="ml-auto font-display text-2xl">{formatBRL(total)}</span>
          </button>
        </div>
      )}

      <ProdutoSheet
        produto={produto}
        adicionais={cardapio.adicionais}
        onClose={() => setProduto(null)}
        onAdd={(e) => {
          cart.adicionar({
            produto: { id: e.produto.id, nome: e.produto.nome, preco: e.produto.preco },
            quantidade: e.quantidade,
            adicionais: e.adicionais.map((a) => ({ id: a.id, nome: a.nome, preco: a.preco })),
            observacao: e.observacao,
          });
          setProduto(null);
          toast.success(`${e.quantidade}× ${e.produto.nome} no pedido`, { duration: 1500 });
        }}
      />

      <CodigoDialog
        open={pedirCodigo}
        mesa={mesa}
        acao={acaoPosCodigo}
        onClose={() => setPedirCodigo(false)}
        onPronto={(nova) => {
          guardar(nova);
          setPedirCodigo(false);
          if (acaoPosCodigo === "enviar" && cart.itens.length > 0) enviar.mutate(nova);
          else setVista("comanda");
        }}
      />

      <ConfirmDialog
        open={confirmaConta}
        onClose={() => setConfirmaConta(false)}
        onConfirm={() => conta.mutate()}
        loading={conta.isPending}
        titulo="Fechar a conta?"
        descricao={`Total até agora: ${formatBRL(comanda?.totais.total ?? 0)}. O pagamento é feito no caixa — vamos avisar a equipe.`}
        confirmar="Pedir a conta"
      />
    </Moldura>
  );
}

/* --------------------------------------------------------------------------- */

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-pub min-h-dvh">
      <div className="mx-auto min-h-dvh max-w-[480px] border-line sm:border-x">{children}</div>
    </div>
  );
}

function MesaNaoLiberada({ mesa, onVer }: { mesa: number; onVer: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <Logo />
      <Mascote className="mt-10 h-28 w-28" />
      <p className="mt-8 font-display text-2xl text-gold">Mesa {mesa}</p>
      <h1 className="mt-1 font-display text-4xl leading-none">Mesa ainda não liberada</h1>
      <p className="mt-3 text-sm text-muted">
        Chame o garçom para abrir sua comanda. Ele vai te passar um código de 4 dígitos para liberar os pedidos pelo celular.
      </p>
      <Button variant="outline" size="lg" className="mt-8" onClick={onVer}>
        Ver o cardápio enquanto isso
      </Button>
    </div>
  );
}

function Carrinho({
  onVoltar,
  onEnviar,
  enviando,
  podeEnviar,
}: {
  onVoltar: () => void;
  onEnviar: () => void;
  enviando: boolean;
  podeEnviar: boolean;
}) {
  const { itens, alterarQuantidade, remover } = useCart();
  const total = totalCarrinho(itens);

  if (!itens.length) {
    return (
      <div className="px-6 pt-10">
        <EmptyState titulo="Seu pedido está vazio" descricao="Escolha um chopp gelado ou um petisco no cardápio." acao={<Button onClick={onVoltar}>Ver cardápio</Button>} />
      </div>
    );
  }

  return (
    <div className="px-4 pb-40 pt-5">
      <h1 className="font-display text-4xl">Revisar pedido</h1>
      <p className="text-sm text-muted">Confira antes de enviar para a cozinha e o bar.</p>
      <ul className="mt-5 space-y-2.5">
        {itens.map((i) => (
          <li key={i.id} className="rounded-card border border-line bg-surface p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.produto.nome}</p>
                {i.adicionais.length > 0 && <p className="text-xs text-muted">+ {i.adicionais.map((a) => a.nome).join(", ")}</p>}
                {i.observacao && <p className="mt-1 text-xs italic text-gold/90">“{i.observacao}”</p>}
              </div>
              <span className="font-semibold tabular-nums">{formatBRL(precoItemCarrinho(i))}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => remover(i.id)} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-subtle hover:text-[#ff6b7f]">
                <Trash2 className="h-4 w-4" /> Remover
              </button>
              <div className="flex items-center rounded-full border border-line">
                <button aria-label="Diminuir" onClick={() => alterarQuantidade(i.id, -1)} className="grid h-9 w-10 place-items-center text-muted hover:text-cream">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{i.quantidade}</span>
                <button aria-label="Aumentar" onClick={() => alterarQuantidade(i.id, 1)} className="grid h-9 w-10 place-items-center text-muted hover:text-cream">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={onVoltar} className="mt-4 w-full rounded-card border border-dashed border-line py-3 text-sm text-muted hover:text-cream">
        + Adicionar mais itens
      </button>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-muted">Total do pedido</span>
          <span className="font-display text-3xl text-gold">{formatBRL(total)}</span>
        </div>
        <Button size="lg" block onClick={onEnviar} loading={enviando} disabled={!podeEnviar}>
          {podeEnviar ? "Enviar pedido" : "Mesa não liberada para pedidos"}
        </Button>
      </div>
    </div>
  );
}

function MinhaComanda({
  carregando,
  comanda,
  podePedirConta,
  onPedirConta,
  onChamar,
  chamando,
}: {
  carregando: boolean;
  comanda: Awaited<ReturnType<typeof getComanda>> | undefined;
  podePedirConta: boolean;
  onPedirConta: () => void;
  onChamar: () => void;
  chamando: boolean;
}) {
  if (carregando || !comanda) return <div className="px-4 pt-6"><SkeletonLista linhas={4} /></div>;
  const itens = comanda.pedidos.flatMap((p) => p.itens.map((i) => ({ ...i, hora: p.criadoEm }))).filter((i) => i.status !== "cancelado");

  return (
    <div className="px-4 pb-44 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Minha comanda</h1>
        <StatusBadge tipo="comanda" status={comanda.status} />
      </div>
      <p className="text-sm text-muted">
        {comanda.clienteNome ? `Comanda de ${comanda.clienteNome} · ` : ""}aberta às {formatHora(comanda.abertaEm)}
      </p>

      {itens.length === 0 ? (
        <EmptyState compacto titulo="Nenhum pedido ainda" descricao="Assim que você pedir, os itens aparecem aqui com o status de preparo." />
      ) : (
        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {itens.map((i) => (
            <li key={i.id} className="flex items-start gap-3 p-3">
              <span className="mt-0.5 grid h-7 min-w-7 place-items-center rounded-md bg-surface-2 px-1.5 text-xs font-bold tabular-nums">{i.quantidade}×</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{i.nome}</p>
                {i.adicionais.length > 0 && <p className="text-xs text-muted">+ {i.adicionais.map((a) => a.nome).join(", ")}</p>}
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge tipo="pedido" status={i.status} />
                  <span className="text-[11px] text-subtle">{formatHora(i.hora)}</span>
                </div>
              </div>
              <span className="text-sm tabular-nums text-muted">{formatBRL(totalItem(i))}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-5 space-y-1.5 rounded-card border border-line bg-bg-soft p-4 text-sm">
        <Linha label="Subtotal" valor={comanda.totais.subtotal} />
        {comanda.totais.taxaServico > 0 && <Linha label="Serviço (opcional)" valor={comanda.totais.taxaServico} />}
        {comanda.totais.desconto > 0 && <Linha label="Desconto" valor={-comanda.totais.desconto} />}
        <div className="flex items-baseline justify-between border-t border-line pt-2">
          <dt className="font-semibold">Total parcial</dt>
          <dd className="font-display text-3xl text-gold">{formatBRL(comanda.totais.total)}</dd>
        </div>
      </dl>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] space-y-2 border-t border-line bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {comanda.status === "aguardando_pagamento" ? (
          <div className="rounded-card border border-gold/40 bg-gold-soft p-4 text-center">
            <Receipt className="mx-auto h-6 w-6 text-gold" />
            <p className="mt-1 font-display text-2xl">Pagamento no caixa</p>
            <p className="text-sm text-muted">Dirija-se ao caixa com o número da mesa. Obrigado pela visita!</p>
          </div>
        ) : (
          <>
            <Button size="lg" block onClick={onPedirConta} disabled={!podePedirConta || itens.length === 0}>
              <Receipt className="h-5 w-5" /> Pedir a conta
            </Button>
            <Button size="lg" variant="secondary" block onClick={onChamar} loading={chamando}>
              <BellRing className="h-5 w-5" /> Chamar garçom
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between text-muted">
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatBRL(valor)}</dd>
    </div>
  );
}

function PedidoEnviado({ pedido, onCardapio, onComanda }: { pedido: Pedido; onCardapio: () => void; onComanda: () => void }) {
  const total = pedido.itens.reduce((s, i) => s + totalItem(i), 0);
  return (
    <div className="flex flex-col items-center px-6 pb-12 pt-12 text-center">
      <Mascote className="h-28 w-28 animate-pop" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-gold">Pedido #{pedido.numero}</p>
      <h1 className="mt-1 font-display text-5xl leading-none">Pedido enviado!</h1>
      <p className="mt-2 text-sm text-muted">A cozinha e o bar já receberam. Você acompanha o preparo na sua comanda.</p>
      <ul className="mt-6 w-full space-y-1.5 rounded-card border border-line bg-surface p-4 text-left text-sm">
        {pedido.itens.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span>
              <b className="tabular-nums">{i.quantidade}×</b> {i.nome}
            </span>
            <span className="tabular-nums text-muted">{formatBRL(totalItem(i))}</span>
          </li>
        ))}
        <li className="flex justify-between border-t border-line pt-2 font-semibold">
          <span>Total</span>
          <span className="text-gold">{formatBRL(total)}</span>
        </li>
      </ul>
      <div className="mt-6 w-full space-y-2">
        <Button size="lg" block onClick={onComanda}>Acompanhar na comanda</Button>
        <Button size="lg" variant="ghost" block onClick={onCardapio}>Voltar ao cardápio</Button>
      </div>
    </div>
  );
}

function CodigoDialog({
  open,
  mesa,
  acao,
  onClose,
  onPronto,
}: {
  open: boolean;
  mesa: number;
  acao: "enviar" | "comanda";
  onClose: () => void;
  onPronto: (sessao: SessaoComanda) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string>();
  const [foco, setFoco] = useState(false);
  const [passo, setPasso] = useState<"codigo" | "dados">("codigo");
  const [comandaId, setComandaId] = useState<string>();
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");

  function terminar(id: string) {
    const sessao = { id, codigo };
    setCodigo("");
    setErro(undefined);
    setPasso("codigo");
    setNome("");
    setCelular("");
    onPronto(sessao);
  }

  const validar = useMutation({
    mutationFn: () => entrarNaComanda(mesa, codigo),
    onSuccess: (c) => {
      setErro(undefined);
      if (c.clienteNome && c.clienteCelular) terminar(c.id);
      else {
        setComandaId(c.id);
        setNome(c.clienteNome ?? "");
        setPasso("dados");
      }
    },
    onError: (e) => setErro(mensagemErro(e)),
  });

  const salvar = useMutation({
    mutationFn: () => identificarCliente(comandaId!, codigo, nome, celular),
    onSuccess: () => terminar(comandaId!),
    onError: (e) => setErro(mensagemErro(e)),
  });

  const fechar = () => {
    setPasso("codigo");
    setErro(undefined);
    onClose();
  };

  if (passo === "dados") {
    const pronto = nome.trim().length >= 2 && celular.replace(/\D/g, "").length >= 10;
    return (
      <Dialog
        open={open}
        onClose={fechar}
        titulo="Quem está pedindo?"
        descricao="Informe seu nome e celular para identificar sua comanda. A equipe usa isso para te chamar e separar a conta."
        largura="sm"
        rodape={
          <Button size="lg" block disabled={!pronto} loading={salvar.isPending} onClick={() => salvar.mutate()}>
            {acao === "enviar" ? "Salvar e enviar pedido" : "Salvar e continuar"}
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Nome" htmlFor="cli-nome">
            <Input id="cli-nome" autoComplete="name" value={nome} onChange={(e) => { setErro(undefined); setNome(e.target.value); }} />
          </Field>
          <Field label="Celular (com DDD)" htmlFor="cli-cel">
            <Input
              id="cli-cel"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(24) 99999-8888"
              value={celular}
              onChange={(e) => { setErro(undefined); setCelular(mascaraCelular(e.target.value)); }}
            />
          </Field>
          {erro && <p role="alert" className="text-sm text-[#ff6b7f]">{erro}</p>}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={fechar}
      titulo="Código da sua comanda"
      descricao="Digite o código de 4 dígitos que o garçom te passou. Cada pessoa da mesa pode ter o seu. Você só precisa fazer isso uma vez."
      largura="sm"
      rodape={
        <Button size="lg" block disabled={codigo.length !== 4} loading={validar.isPending} onClick={() => validar.mutate()}>
          {acao === "enviar" ? "Continuar" : "Ver minha comanda"}
        </Button>
      }
    >
      {/* um input real (invisível) por cima de 4 caixinhas: funciona com teclado, colar e autofill */}
      <label className="relative block">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Código de 4 dígitos"
          aria-invalid={!!erro}
          maxLength={4}
          value={codigo}
          onChange={(e) => {
            setErro(undefined);
            setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4));
          }}
          onKeyDown={(e) => e.key === "Enter" && codigo.length === 4 && validar.mutate()}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <span className={cn("grid grid-cols-4 gap-3", erro && "animate-[pop_300ms]")} aria-hidden>
          {[0, 1, 2, 3].map((i) => {
            const ativo = codigo.length === i || (i === 3 && codigo.length === 4);
            return (
              <span
                key={i}
                className={cn(
                  "grid h-20 place-items-center rounded-card border-2 bg-bg font-display text-5xl text-gold transition-colors",
                  erro ? "border-red" : ativo && foco ? "border-gold" : "border-line",
                  codigo[i] && !erro && "border-gold/50",
                )}
              >
                {codigo[i] ?? (ativo && foco ? <span className="h-8 w-0.5 animate-pulse bg-gold" /> : "")}
              </span>
            );
          })}
        </span>
      </label>
      {erro && <p role="alert" className="mt-3 text-center text-sm text-[#ff6b7f]">{erro}</p>}
      <p className="mt-4 text-center text-xs text-subtle">Sem o código? Chame o garçom.</p>
    </Dialog>
  );
}
