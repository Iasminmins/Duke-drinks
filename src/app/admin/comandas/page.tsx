"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { adicionarCartoes, listarCartoes, removerCartao, type Cartao } from "@/services/mesas.service";
import { mensagemErro } from "@/lib/errors";
import { cn } from "@/lib/utils";

/** Cadastro dos cartões físicos com número e QR fixo; as comandas abertas ficam em Caixa → Comandas. */
export default function ComandasAdmin() {
  const q = useQuery({ queryKey: ["cartoes"], queryFn: listarCartoes });
  const cartoes = q.data ?? [];
  const emUso = cartoes.filter((c) => c.emUso).length;
  const [faixa, setFaixa] = useState<{ de: string; ate: string } | null>(null);
  const [apagar, setApagar] = useState<Cartao | null>(null);

  const novaFaixa = () => {
    const prox = (Math.max(0, ...cartoes.map((c) => c.numero)) || 0) + 1;
    setFaixa({ de: String(prox), ate: String(prox + 49) });
  };

  const add = useMutation({
    mutationFn: () => adicionarCartoes(Number(faixa!.de), Number(faixa!.ate)),
    onSuccess: (r) => {
      toast.success(r.adicionados ? `${r.adicionados} cartões cadastrados` : "Esses números já estavam cadastrados");
      setFaixa(null);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const del = useMutation({
    mutationFn: (n: number) => removerCartao(n),
    onSuccess: () => {
      toast.success("Cartão removido");
      setApagar(null);
    },
    onError: (e) => {
      toast.error(mensagemErro(e));
      setApagar(null);
    },
  });

  const de = Number(faixa?.de);
  const ate = Number(faixa?.ate);
  const faixaOk = !!faixa && de >= 1 && ate <= 9999 && de <= ate && ate - de < 500;

  return (
    <div>
      <PageHeader
        descricao={
          cartoes.length
            ? `${cartoes.length} comandas cadastradas · ${emUso} em uso agora. Cada cartão tem um QR fixo: o garçom abre a comanda no número e entrega o cartão ao cliente.`
            : "Cadastre os números físicos usados pelo salão. As comandas abertas e o histórico ficam em Comandas."
        }
        acoes={
          cartoes.length > 0 && (
            <>
              <Link
                href="/imprimir/cartoes"
                target="_blank"
                className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm hover:bg-surface-2"
              >
                <Printer className="h-4 w-4" /> Imprimir cards com QR
              </Link>
                <Button onClick={novaFaixa}>
                <Plus className="h-4 w-4" /> Adicionar cartões
              </Button>
            </>
          )
        }
      />

      {q.isLoading && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-12">
          {Array.from({ length: 24 }, (_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {!q.isLoading && cartoes.length === 0 && (
        <Card className="mx-auto max-w-xl p-6 text-center">
          <p className="font-display text-3xl">Cadastre os números dos cartões</p>
          <p className="mt-2 text-sm text-muted">
            Se o seu salão usa cartões de comanda numerados, cadastre os números aqui (por exemplo, de 1 a 100). O garçom vai
            escolher um deles ao abrir a comanda do cliente.
          </p>
          <p className="mt-2 text-sm text-subtle">Sem cadastro, o sistema numera as comandas sozinho: 1, 2, 3…</p>
          <Button className="mt-5" onClick={novaFaixa}>
            <Plus className="h-4 w-4" /> Cadastrar comandas
          </Button>
        </Card>
      )}

      {cartoes.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {cartoes.map((c) => (
            <div
              key={c.numero}
              className={cn(
                "group relative rounded-card border p-3 text-center",
                c.emUso ? "border-gold/60 bg-gold-soft" : "border-line bg-surface",
              )}
            >
              <p className={cn("font-display text-3xl leading-none", c.emUso && "text-gold")}>{c.numero}</p>
              <p className="mt-1 truncate text-xs text-muted" title={c.clienteNome}>
                {c.emUso ? c.clienteNome || "em uso" : "livre"}
              </p>
              {!c.emUso && (
                <button
                  onClick={() => setApagar(c)}
                  aria-label={`Remover comanda ${c.numero}`}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md text-subtle opacity-60 hover:bg-surface-2 hover:text-cream group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {faixa && (
        <Dialog
          open
          onClose={() => setFaixa(null)}
          titulo="Cadastrar comandas"
          descricao="Informe a faixa de números impressos nos seus cartões."
          largura="sm"
          rodape={
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setFaixa(null)}>Cancelar</Button>
              <Button block loading={add.isPending} disabled={!faixaOk} onClick={() => add.mutate()}>
                {faixaOk ? `Cadastrar ${ate - de + 1}` : "Cadastrar"}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Do número" htmlFor="k-de">
              <Input id="k-de" inputMode="numeric" value={faixa.de} onChange={(e) => setFaixa({ ...faixa, de: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </Field>
            <Field label="Até o número" htmlFor="k-ate">
              <Input id="k-ate" inputMode="numeric" value={faixa.ate} onChange={(e) => setFaixa({ ...faixa, ate: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </Field>
          </div>
          {faixa && !faixaOk && faixa.de && faixa.ate && (
            <p className="mt-3 text-xs text-red">Use uma faixa de até 500 números, com o primeiro menor que o último.</p>
          )}
        </Dialog>
      )}

      <ConfirmDialog
        open={!!apagar}
        onClose={() => setApagar(null)}
        onConfirm={() => apagar && del.mutate(apagar.numero)}
        loading={del.isPending}
        perigo
        titulo={`Remover a comanda ${apagar?.numero}?`}
        descricao="Ela deixa de aparecer na lista do garçom. O histórico das contas antigas continua."
        confirmar="Remover"
      />
    </div>
  );
}
