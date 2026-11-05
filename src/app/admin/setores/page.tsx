"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CrudSimples } from "@/components/admin/crud-simples";
import { Field, Input } from "@/components/ui/input";
import { excluirSetor, getCardapioAdmin, salvarSetor } from "@/services/cardapio.service";
import type { Setor } from "@/types";

type F = Omit<Setor, "id"> & { id?: string };
const slugify = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

export default function SetoresPage() {
  const q = useQuery({ queryKey: ["cardapio-admin"], queryFn: getCardapioAdmin });
  const contar = (id: string) => q.data?.produtos.filter((p) => p.ativo && p.setorId === id).length ?? 0;
  return (
    <CrudSimples<Setor, F>
      descricao="Cada setor tem sua própria tela de produção (KDS). Os itens vão para o setor do produto."
      itens={q.data?.setores}
      carregando={q.isLoading}
      nomeItem="Setor"
      rotulo={(s) => s.nome}
      colunas={[
        { titulo: "Nome", render: (s) => <span className="font-medium">{s.nome}</span> },
        { titulo: "Produtos", render: (s) => <span className="text-muted">{contar(s.id)}</span> },
        {
          titulo: "Tela KDS",
          render: (s) => (
            <Link href={`/kds/${s.slug}`} className="text-gold underline-offset-4 hover:underline">
              /kds/{s.slug}
            </Link>
          ),
        },
      ]}
      novo={() => ({ nome: "", slug: "" })}
      paraForm={(s) => ({ ...s })}
      validar={(f) => (f.nome.trim().length < 2 ? "Informe o nome do setor" : null)}
      salvar={(f) => salvarSetor({ ...f, nome: f.nome.trim(), slug: f.slug || slugify(f.nome) })}
      excluir={(s) => excluirSetor(s.id)}
      campos={(f, set) => (
        <Field label="Nome" htmlFor="s-nome" dica="Ex.: Cozinha, Bar, Chopeira">
          <Input id="s-nome" value={f.nome} onChange={(e) => set({ nome: e.target.value, slug: f.slug && f.slug !== slugify(f.nome) ? f.slug : slugify(e.target.value) })} />
        </Field>
      )}
    />
  );
}
