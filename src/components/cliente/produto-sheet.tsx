"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatBRL } from "@/lib/format";
import { cn, round2 } from "@/lib/utils";
import type { Adicional, Produto } from "@/types";
import { ProdutoImagem } from "./produto-imagem";

export interface EscolhaProduto {
  produto: Produto;
  quantidade: number;
  adicionais: Adicional[];
  observacao?: string;
}

export function ProdutoSheet({
  produto,
  adicionais,
  onClose,
  onAdd,
  textoBotao = "Adicionar",
}: {
  produto: Produto | null;
  adicionais: Adicional[];
  onClose: () => void;
  onAdd: (e: EscolhaProduto) => void;
  textoBotao?: string;
}) {
  const [qtd, setQtd] = useState(1);
  const [sel, setSel] = useState<string[]>([]);
  const [obs, setObs] = useState("");

  useEffect(() => {
    setQtd(1);
    setSel([]);
    setObs("");
  }, [produto?.id]);

  if (!produto) return null;
  const opcoes = adicionais.filter((a) => produto.adicionaisIds.includes(a.id));
  const escolhidos = opcoes.filter((a) => sel.includes(a.id));
  const total = round2((produto.preco + escolhidos.reduce((s, a) => s + a.preco, 0)) * qtd);

  return (
    <Dialog
      open={!!produto}
      onClose={onClose}
      titulo={produto.nome}
      variante="bottom"
      esconderTitulo
      rodape={
        <div className="flex items-center gap-3">
          <div className="flex h-14 shrink-0 items-center rounded-[10px] border border-line bg-surface">
            <button
              aria-label="Diminuir quantidade"
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="grid h-14 w-11 place-items-center text-muted hover:text-cream disabled:opacity-30"
              disabled={qtd <= 1}
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite">{qtd}</span>
            <button aria-label="Aumentar quantidade" onClick={() => setQtd((q) => Math.min(30, q + 1))} className="grid h-14 w-11 place-items-center text-muted hover:text-cream">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <Button
            size="lg"
            block
            className="min-w-0 justify-between px-4"
            onClick={() => onAdd({ produto, quantidade: qtd, adicionais: escolhidos, observacao: obs.trim() || undefined })}
          >
            <span className="truncate">{textoBotao}</span>
            <span className="font-display text-2xl leading-none">{formatBRL(total)}</span>
          </Button>
        </div>
      }
    >
      <div className="-mx-5 -mt-0">
        <ProdutoImagem produto={produto} className="h-52 w-full sm:h-60" />
      </div>
      <div className="pt-4">
        <h2 className="font-display text-3xl leading-none">{produto.nome}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{produto.descricao}</p>
        <p className="mt-3 font-display text-2xl text-gold">{formatBRL(produto.preco)}</p>
      </div>

      {opcoes.length > 0 && (
        <fieldset className="mt-5">
          <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
            Adicionais <span className="text-xs font-normal text-subtle">opcional</span>
          </legend>
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line">
            {opcoes.map((a) => {
              const on = sel.includes(a.id);
              return (
                <label key={a.id} className="flex min-h-12 cursor-pointer items-center gap-3 bg-surface px-3 py-2 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => setSel((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                  />
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-md border",
                      on ? "border-gold bg-gold text-bg" : "border-line",
                    )}
                  >
                    {on && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-sm">{a.nome}</span>
                  <span className="text-sm text-muted">{a.preco > 0 ? `+ ${formatBRL(a.preco)}` : "grátis"}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-5">
        <label htmlFor="obs" className="mb-2 block text-sm font-semibold">
          Alguma observação?
        </label>
        <Textarea
          id="obs"
          maxLength={140}
          placeholder="Ex.: sem cebola, bem gelado, molho à parte…"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-subtle">{obs.length}/140</p>
      </div>
    </Dialog>
  );
}
