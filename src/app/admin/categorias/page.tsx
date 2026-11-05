"use client";

import { useQuery } from "@tanstack/react-query";
import { CrudSimples } from "@/components/admin/crud-simples";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { excluirCategoria, getCardapioAdmin, salvarCategoria } from "@/services/cardapio.service";
import type { Categoria } from "@/types";

type F = Omit<Categoria, "id"> & { id?: string };

export default function CategoriasPage() {
  const q = useQuery({ queryKey: ["cardapio-admin"], queryFn: getCardapioAdmin });
  const contar = (id: string) => q.data?.produtos.filter((p) => p.ativo && p.categoriaId === id).length ?? 0;
  return (
    <CrudSimples<Categoria, F>
      descricao="A ordem define a sequência das abas no cardápio do cliente."
      itens={q.data?.categorias}
      carregando={q.isLoading}
      nomeItem="Categoria"
      rotulo={(c) => c.nome}
      colunas={[
        { titulo: "Ordem", render: (c) => <span className="font-display text-xl text-gold">{c.ordem}</span>, className: "w-20" },
        { titulo: "Nome", render: (c) => <span className="font-medium">{c.nome}</span> },
        { titulo: "Produtos", render: (c) => <span className="tabular-nums text-muted">{contar(c.id)}</span> },
        { titulo: "Status", render: (c) => (c.ativa ? <Badge tom="ok">Visível</Badge> : <Badge>Oculta</Badge>) },
      ]}
      novo={() => ({ nome: "", ordem: (q.data?.categorias.length ?? 0) + 1, ativa: true })}
      paraForm={(c) => ({ ...c })}
      validar={(f) => (f.nome.trim().length < 2 ? "Informe o nome da categoria" : null)}
      salvar={(f) => salvarCategoria({ ...f, nome: f.nome.trim() })}
      excluir={(c) => excluirCategoria(c.id)}
      campos={(f, set) => (
        <>
          <Field label="Nome" htmlFor="c-nome">
            <Input id="c-nome" value={f.nome} onChange={(e) => set({ nome: e.target.value })} />
          </Field>
          <Field label="Ordem no cardápio" htmlFor="c-ordem">
            <Input id="c-ordem" type="number" min={1} value={f.ordem} onChange={(e) => set({ ordem: Number(e.target.value) })} />
          </Field>
          <label className="flex items-center justify-between text-sm">
            Visível no cardápio <Switch checked={f.ativa} onChange={(v) => set({ ativa: v })} />
          </label>
        </>
      )}
    />
  );
}
