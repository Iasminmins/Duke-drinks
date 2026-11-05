"use client";

import { useQuery } from "@tanstack/react-query";
import { CrudSimples } from "@/components/admin/crud-simples";
import { Field, Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { excluirAdicional, getCardapioAdmin, salvarAdicional } from "@/services/cardapio.service";
import { formatBRL } from "@/lib/format";
import type { Adicional } from "@/types";

type F = Omit<Adicional, "id"> & { id?: string };

export default function AdicionaisPage() {
  const q = useQuery({ queryKey: ["cardapio-admin"], queryFn: getCardapioAdmin });
  const usos = (id: string) => q.data?.produtos.filter((p) => p.ativo && p.adicionaisIds.includes(id)).length ?? 0;
  return (
    <CrudSimples<Adicional, F>
      descricao="Extras que o cliente pode escolher. Vincule a cada produto na tela de Produtos."
      itens={q.data?.adicionais}
      carregando={q.isLoading}
      nomeItem="Adicional"
      rotulo={(a) => a.nome}
      colunas={[
        { titulo: "Nome", render: (a) => <span className="font-medium">{a.nome}</span> },
        { titulo: "Preço", render: (a) => <span className="tabular-nums">{a.preco > 0 ? formatBRL(a.preco) : "Grátis"}</span> },
        { titulo: "Usado em", render: (a) => <span className="text-muted">{usos(a.id)} produto(s)</span> },
      ]}
      novo={() => ({ nome: "", preco: 0 })}
      paraForm={(a) => ({ ...a })}
      validar={(f) => (f.nome.trim().length < 2 ? "Informe o nome" : f.preco < 0 ? "Preço inválido" : null)}
      salvar={(f) => salvarAdicional({ ...f, nome: f.nome.trim() })}
      excluir={(a) => excluirAdicional(a.id)}
      campos={(f, set) => (
        <>
          <Field label="Nome" htmlFor="a-nome">
            <Input id="a-nome" value={f.nome} onChange={(e) => set({ nome: e.target.value })} />
          </Field>
          <Field label="Preço (0 = grátis)" htmlFor="a-preco">
            <MoneyInput id="a-preco" value={f.preco} onChange={(v) => set({ preco: v })} />
          </Field>
        </>
      )}
    />
  );
}
