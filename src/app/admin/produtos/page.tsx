"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ChevronLeft, ChevronRight, ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SkeletonLista } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProdutoImagem } from "@/components/cliente/produto-imagem";
import { alternarEsgotado, excluirProduto, getCardapioAdmin, salvarProduto } from "@/services/cardapio.service";
import { formatBRL } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Produto } from "@/types";

const POR_PAGINA = 10;

const schema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(60),
  descricao: z.string().trim().max(160, "Máximo 160 caracteres"),
  preco: z.number().positive("Informe o preço"),
  categoriaId: z.string().min(1, "Escolha a categoria"),
  setorId: z.string().min(1, "Escolha o setor"),
});

type Form = Omit<Produto, "id"> & { id?: string };

export default function ProdutosPage() {
  const q = useQuery({ queryKey: ["cardapio-admin"], queryFn: getCardapioAdmin });
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  const [setor, setSetor] = useState("");
  const [soEsgotados, setSoEsgotados] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Form | null>(null);
  const [excluir, setExcluir] = useState<Produto | null>(null);

  const toggle = useMutation({ mutationFn: alternarEsgotado, onError: (e) => toast.error(mensagemErro(e)) });
  const del = useMutation({
    mutationFn: (id: string) => excluirProduto(id),
    onSuccess: () => {
      toast.success("Produto removido do cardápio");
      setExcluir(null);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (q.data?.produtos ?? [])
      .filter((p) => p.ativo)
      .filter((p) => !t || p.nome.toLowerCase().includes(t))
      .filter((p) => !cat || p.categoriaId === cat)
      .filter((p) => !setor || p.setorId === setor)
      .filter((p) => !soEsgotados || p.esgotado)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [q.data, busca, cat, setor, soEsgotados]);

  useEffect(() => {
    setPagina(1);
  }, [busca, cat, setor, soEsgotados]);
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visiveis = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const nomeCat = (id: string) => q.data?.categorias.find((c) => c.id === id)?.nome ?? "—";
  const nomeSetor = (id: string) => q.data?.setores.find((s) => s.id === id)?.nome ?? "—";

  const novo = (): Form => ({
    nome: "",
    descricao: "",
    preco: 0,
    categoriaId: q.data?.categorias[0]?.id ?? "",
    setorId: q.data?.setores[0]?.id ?? "",
    adicionaisIds: [],
    esgotado: false,
    ativo: true,
  });

  return (
    <div>
      <PageHeader
        descricao={q.data ? `${filtrados.length} produto(s) · ${q.data.produtos.filter((p) => p.ativo && p.esgotado).length} esgotado(s)` : undefined}
        acoes={<Button onClick={() => setEditando(novo())}><Plus className="h-4 w-4" /> Novo produto</Button>}
      />

      <Card className="mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input placeholder="Buscar por nome" aria-label="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label="Filtrar por categoria" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {q.data?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Select aria-label="Filtrar por setor" value={setor} onChange={(e) => setSetor(e.target.value)}>
          <option value="">Todos os setores</option>
          {q.data?.setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </Select>
        <label className="flex h-11 items-center gap-2 rounded-[10px] border border-line px-3 text-sm">
          <Switch checked={soEsgotados} onChange={setSoEsgotados} label="Só esgotados" /> Só esgotados
        </label>
      </Card>

      {q.isLoading && <SkeletonLista linhas={6} />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {q.data && filtrados.length === 0 && (
        <EmptyState titulo="Nenhum produto" descricao="Ajuste os filtros ou cadastre um novo produto." />
      )}

      {visiveis.length > 0 && (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-subtle">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Setor</th>
                  <th className="px-4 py-3 text-right font-medium">Preço</th>
                  <th className="px-4 py-3 text-center font-medium">Esgotado</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visiveis.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <ProdutoImagem produto={p} className="h-11 w-11 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <p className="font-medium">{p.nome}</p>
                          <p className="max-w-xs truncate text-xs text-subtle">{p.descricao}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{nomeCat(p.categoriaId)}</td>
                    <td className="px-4 py-2.5"><Badge tom={p.setorId === "s_bar" ? "info" : "warn"}>{nomeSetor(p.setorId)}</Badge></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(p.preco)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Switch checked={p.esgotado} onChange={() => toggle.mutate(p.id)} label={`Esgotado: ${p.nome}`} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={`Editar ${p.nome}`} onClick={() => setEditando(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${p.nome}`} onClick={() => setExcluir(p)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="space-y-2 md:hidden">
            {visiveis.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
                <ProdutoImagem produto={p} className="h-14 w-14 shrink-0 rounded-lg" />
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditando(p)}>
                  <p className="truncate font-medium">{p.nome}</p>
                  <p className="text-xs text-muted">{nomeCat(p.categoriaId)} · {formatBRL(p.preco)}</p>
                </button>
                <div className="flex flex-col items-center gap-1">
                  <Switch checked={p.esgotado} onChange={() => toggle.mutate(p.id)} label={`Esgotado: ${p.nome}`} />
                  <span className="text-[10px] text-subtle">Esgotado</span>
                </div>
              </li>
            ))}
          </ul>

          {paginas > 1 && (
            <nav aria-label="Paginação" className="mt-4 flex items-center justify-end gap-2 text-sm">
              <span className="mr-2 text-muted">Página {pagina} de {paginas}</span>
              <Button size="icon-sm" variant="secondary" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon-sm" variant="secondary" disabled={pagina === paginas} onClick={() => setPagina((p) => p + 1)} aria-label="Próxima página">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          )}
        </>
      )}

      {editando && q.data && (
        <ProdutoForm inicial={editando} dados={q.data} onClose={() => setEditando(null)} />
      )}
      <ConfirmDialog
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={() => excluir && del.mutate(excluir.id)}
        loading={del.isPending}
        perigo
        titulo={`Excluir ${excluir?.nome}?`}
        descricao="O produto sai do cardápio, mas continua no histórico dos pedidos já feitos."
        confirmar="Excluir"
      />
    </div>
  );
}

function ProdutoForm({
  inicial,
  dados,
  onClose,
}: {
  inicial: Form;
  dados: Awaited<ReturnType<typeof getCardapioAdmin>>;
  onClose: () => void;
}) {
  const [f, setF] = useState<Form>(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const salvar = useMutation({
    mutationFn: () => salvarProduto(f),
    onSuccess: () => {
      toast.success(f.id ? "Produto atualizado" : "Produto criado");
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  function submeter() {
    const r = schema.safeParse(f);
    if (!r.success) {
      setErros(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErros({});
    salvar.mutate();
  }

  function onImagem(file?: File) {
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Imagem muito grande (máx. 1,5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("imagemUrl", String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      titulo={f.id ? "Editar produto" : "Novo produto"}
      variante="right"
      rodape={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose}>Cancelar</Button>
          <Button block loading={salvar.isPending} onClick={submeter}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <ProdutoImagem produto={{ ...f, nome: f.nome || "Produto" }} className="h-24 w-24 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-line px-3 text-sm hover:bg-surface">
              <ImagePlus className="h-4 w-4" /> {f.imagemUrl ? "Trocar foto" : "Enviar foto"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onImagem(e.target.files?.[0])} />
            </label>
            {f.imagemUrl && (
              <button className="block text-xs text-subtle hover:text-[#ff6b7f]" onClick={() => set("imagemUrl", undefined)}>Remover foto</button>
            )}
            <p className="text-xs text-subtle">Quadrada, até 1,5 MB. Preview local na demo.</p>
          </div>
        </div>

        <Field label="Nome" htmlFor="p-nome" erro={erros.nome}>
          <Input id="p-nome" value={f.nome} onChange={(e) => set("nome", e.target.value)} aria-invalid={!!erros.nome} />
        </Field>
        <Field label="Descrição" htmlFor="p-desc" erro={erros.descricao} dica={`${f.descricao.length}/160`}>
          <Textarea id="p-desc" value={f.descricao} maxLength={160} onChange={(e) => set("descricao", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço" htmlFor="p-preco" erro={erros.preco}>
            <MoneyInput id="p-preco" value={f.preco} onChange={(v) => set("preco", v)} aria-invalid={!!erros.preco} />
          </Field>
          <Field label="Setor de produção" htmlFor="p-setor" erro={erros.setorId}>
            <Select id="p-setor" value={f.setorId} onChange={(e) => set("setorId", e.target.value)}>
              {dados.setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Categoria" htmlFor="p-cat" erro={erros.categoriaId}>
          <Select id="p-cat" value={f.categoriaId} onChange={(e) => set("categoriaId", e.target.value)}>
            {dados.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-muted">Adicionais permitidos</legend>
          <div className="flex flex-wrap gap-2">
            {dados.adicionais.map((a) => {
              const on = f.adicionaisIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("adicionaisIds", on ? f.adicionaisIds.filter((x) => x !== a.id) : [...f.adicionaisIds, a.id])}
                  className={cn("rounded-full border px-3 py-1.5 text-xs", on ? "border-gold bg-gold-soft text-gold" : "border-line text-muted")}
                >
                  {a.nome} · {formatBRL(a.preco)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-3 rounded-card border border-line p-3">
          <label className="flex items-center justify-between text-sm">
            Destaque (selo “Top”) <Switch checked={!!f.destaque} onChange={(v) => set("destaque", v)} />
          </label>
          <label className="flex items-center justify-between text-sm">
            Esgotado <Switch checked={f.esgotado} onChange={(v) => set("esgotado", v)} />
          </label>
        </div>
      </div>
    </Dialog>
  );
}
