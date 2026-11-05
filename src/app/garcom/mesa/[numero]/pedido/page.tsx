"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, Send } from "lucide-react";
import { CardapioLista } from "@/components/cliente/cardapio-lista";
import { ProdutoSheet, type EscolhaProduto } from "@/components/cliente/produto-sheet";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SkeletonLista } from "@/components/ui/skeleton";
import { getCardapio } from "@/services/cardapio.service";
import { listarMesasComStatus } from "@/services/mesas.service";
import { criarPedido } from "@/services/pedidos.service";
import { formatBRL } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { round2, uid } from "@/lib/utils";
import type { Produto } from "@/types";

type Linha = EscolhaProduto & { id: string };
const valor = (l: Linha) => round2((l.produto.preco + l.adicionais.reduce((s, a) => s + a.preco, 0)) * l.quantidade);

export default function LancarPedido() {
  return (
    <Suspense fallback={<SkeletonLista />}>
      <LancarPedidoConteudo />
    </Suspense>
  );
}

function LancarPedidoConteudo() {
  const { numero } = useParams<{ numero: string }>();
  const comandaParam = useSearchParams().get("c");
  const router = useRouter();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [revisar, setRevisar] = useState(false);

  const cardapioQ = useQuery({ queryKey: ["cardapio"], queryFn: getCardapio });
  const mesasQ = useQuery({ queryKey: ["mesas-status"], queryFn: listarMesasComStatus });
  const mesa = mesasQ.data?.find((m) => m.numero === Number(numero));
  // comanda escolhida na tela da mesa (?c=...); sem ela, a primeira aberta
  const comanda = mesa?.comandas.find((c) => c.id === comandaParam) ?? mesa?.comanda;

  const enviar = useMutation({
    mutationFn: () =>
      criarPedido({
        comandaId: comanda!.id,
        origem: "garcom",
        itens: linhas.map((l) => ({
          produtoId: l.produto.id,
          quantidade: l.quantidade,
          adicionaisIds: l.adicionais.map((a) => a.id),
          observacao: l.observacao,
        })),
      }),
    onSuccess: (p) => {
      toast.success(`Pedido #${p.numero} enviado para produção`);
      router.push(`/garcom/mesa/${numero}`);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  if (cardapioQ.isLoading || mesasQ.isLoading) return <SkeletonLista />;
  if (!comanda) {
    return <p className="py-10 text-center text-muted">Esta mesa não tem comanda aberta.</p>;
  }

  const qtd = linhas.reduce((s, l) => s + l.quantidade, 0);
  const total = round2(linhas.reduce((s, l) => s + valor(l), 0));

  return (
    <div className="-mx-4 -mt-5">
      <div className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => router.back()} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full border border-line">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="leading-tight">
          <h1 className="font-display text-3xl">Pedido · Mesa {numero}</h1>
          {comanda.clienteNome && <p className="text-sm text-gold">Comanda de {comanda.clienteNome}</p>}
        </div>
      </div>
      <CardapioLista categorias={cardapioQ.data!.categorias} produtos={cardapioQ.data!.produtos} onSelecionar={setProduto} topoSticky={64} />

      {qtd > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-3xl px-4 pb-3">
          <button onClick={() => setRevisar(true)} className="flex h-14 w-full items-center gap-3 rounded-2xl bg-gold px-4 font-semibold text-bg shadow-xl">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-bg px-2 text-sm text-gold">{qtd}</span>
            Revisar e enviar
            <span className="ml-auto font-display text-2xl">{formatBRL(total)}</span>
          </button>
        </div>
      )}

      <ProdutoSheet
        produto={produto}
        adicionais={cardapioQ.data!.adicionais}
        onClose={() => setProduto(null)}
        onAdd={(e) => {
          setLinhas((ls) => [...ls, { ...e, id: uid() }]);
          setProduto(null);
        }}
      />

      <Dialog
        open={revisar}
        onClose={() => setRevisar(false)}
        titulo={`Pedido da mesa ${numero}${comanda.clienteNome ? ` · ${comanda.clienteNome}` : ""}`}
        rodape={
          <Button size="lg" block loading={enviar.isPending} disabled={!linhas.length} onClick={() => enviar.mutate()}>
            <Send className="h-5 w-5" /> Enviar · {formatBRL(total)}
          </Button>
        }
      >
        <ul className="divide-y divide-line">
          {linhas.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{l.produto.nome}</p>
                {l.adicionais.length > 0 && <p className="text-xs text-muted">+ {l.adicionais.map((a) => a.nome).join(", ")}</p>}
                {l.observacao && <p className="text-xs text-gold">“{l.observacao}”</p>}
              </div>
              <div className="flex items-center rounded-full border border-line">
                <button
                  aria-label="Diminuir"
                  className="grid h-9 w-9 place-items-center"
                  onClick={() => setLinhas((ls) => ls.map((x) => (x.id === l.id ? { ...x, quantidade: x.quantidade - 1 } : x)).filter((x) => x.quantidade > 0))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm tabular-nums">{l.quantidade}</span>
                <button
                  aria-label="Aumentar"
                  className="grid h-9 w-9 place-items-center"
                  onClick={() => setLinhas((ls) => ls.map((x) => (x.id === l.id ? { ...x, quantidade: x.quantidade + 1 } : x)))}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="w-20 text-right text-sm tabular-nums">{formatBRL(valor(l))}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
