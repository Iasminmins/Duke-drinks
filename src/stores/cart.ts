"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Adicional, Produto } from "@/types";
import { round2, uid } from "@/lib/utils";

export interface ItemCarrinho {
  id: string;
  produto: Pick<Produto, "id" | "nome" | "preco">;
  quantidade: number;
  adicionais: Pick<Adicional, "id" | "nome" | "preco">[];
  observacao?: string;
}

interface CartState {
  mesa: number | null;
  itens: ItemCarrinho[];
  /** incrementa a cada adição; usado para animar o contador */
  pulso: number;
  setMesa: (mesa: number) => void;
  adicionar: (item: Omit<ItemCarrinho, "id">) => void;
  alterarQuantidade: (id: string, delta: number) => void;
  remover: (id: string) => void;
  limpar: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      mesa: null,
      itens: [],
      pulso: 0,
      setMesa: (mesa) => {
        // carrinho é por mesa: trocar de mesa zera
        if (get().mesa !== mesa) set({ mesa, itens: [] });
      },
      adicionar: (item) =>
        set((s) => {
          const chave = (i: Omit<ItemCarrinho, "id">) =>
            `${i.produto.id}|${i.adicionais.map((a) => a.id).sort().join(",")}|${i.observacao ?? ""}`;
          const existente = s.itens.find((i) => chave(i) === chave(item));
          const itens = existente
            ? s.itens.map((i) => (i === existente ? { ...i, quantidade: i.quantidade + item.quantidade } : i))
            : [...s.itens, { ...item, id: uid("ci_") }];
          return { itens, pulso: s.pulso + 1 };
        }),
      alterarQuantidade: (id, delta) =>
        set((s) => ({
          itens: s.itens
            .map((i) => (i.id === id ? { ...i, quantidade: i.quantidade + delta } : i))
            .filter((i) => i.quantidade > 0),
        })),
      remover: (id) => set((s) => ({ itens: s.itens.filter((i) => i.id !== id) })),
      limpar: () => set({ itens: [] }),
    }),
    {
      name: "duke:carrinho",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ mesa: s.mesa, itens: s.itens }),
    },
  ),
);

export const precoItemCarrinho = (i: ItemCarrinho) =>
  round2((i.produto.preco + i.adicionais.reduce((s, a) => s + a.preco, 0)) * i.quantidade);

export const totalCarrinho = (itens: ItemCarrinho[]) => round2(itens.reduce((s, i) => s + precoItemCarrinho(i), 0));
export const qtdCarrinho = (itens: ItemCarrinho[]) => itens.reduce((s, i) => s + i.quantidade, 0);
