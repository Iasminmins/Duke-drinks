"use client";

import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonLista } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { mensagemErro } from "@/lib/errors";

/**
 * Lista + formulário em modal para cadastros pequenos
 * (categorias, adicionais, setores). Cada página define colunas e campos.
 */
export function CrudSimples<T extends { id: string }, F extends object>({
  descricao,
  itens,
  carregando,
  nomeItem,
  colunas,
  novo,
  paraForm,
  validar,
  campos,
  salvar,
  excluir,
  rotulo,
}: {
  descricao: string;
  itens?: T[];
  carregando: boolean;
  nomeItem: string;
  colunas: { titulo: string; render: (item: T) => ReactNode; className?: string }[];
  novo: () => F;
  paraForm: (item: T) => F;
  validar: (f: F) => string | null;
  campos: (f: F, set: (patch: Partial<F>) => void) => ReactNode;
  salvar: (f: F) => Promise<unknown>;
  excluir?: (item: T) => Promise<unknown>;
  rotulo: (item: T) => string;
}) {
  const [form, setForm] = useState<F | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [apagar, setApagar] = useState<T | null>(null);

  const salvarM = useMutation({
    mutationFn: (f: F) => salvar(f),
    onSuccess: () => {
      toast.success(`${nomeItem} salvo`);
      setForm(null);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const excluirM = useMutation({
    mutationFn: (i: T) => excluir!(i),
    onSuccess: () => {
      toast.success(`${nomeItem} excluído`);
      setApagar(null);
    },
    onError: (e) => {
      toast.error(mensagemErro(e));
      setApagar(null);
    },
  });

  const editando = form && "id" in form && (form as { id?: string }).id;

  return (
    <div>
      <PageHeader
        descricao={descricao}
        acoes={
          <Button
            onClick={() => {
              setErro(null);
              setForm(novo());
            }}
          >
            <Plus className="h-4 w-4" /> Novo
          </Button>
        }
      />
      {carregando && <SkeletonLista />}
      {itens && itens.length === 0 && <EmptyState titulo="Nada cadastrado" />}
      {itens && itens.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-subtle">
                {colunas.map((c) => (
                  <th key={c.titulo} className={`px-4 py-3 font-medium ${c.className ?? ""}`}>{c.titulo}</th>
                ))}
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {itens.map((item) => (
                <tr key={item.id} className="hover:bg-surface-2/50">
                  {colunas.map((c) => (
                    <td key={c.titulo} className={`px-4 py-3 ${c.className ?? ""}`}>{c.render(item)}</td>
                  ))}
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Editar ${rotulo(item)}`}
                        onClick={() => {
                          setErro(null);
                          setForm(paraForm(item));
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {excluir && (
                        <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${rotulo(item)}`} onClick={() => setApagar(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {form && (
        <Dialog
          open
          onClose={() => setForm(null)}
          titulo={editando ? `Editar ${nomeItem.toLowerCase()}` : `Novo ${nomeItem.toLowerCase()}`}
          largura="sm"
          rodape={
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setForm(null)}>Cancelar</Button>
              <Button
                block
                loading={salvarM.isPending}
                onClick={() => {
                  const e = validar(form);
                  setErro(e);
                  if (!e) salvarM.mutate(form);
                }}
              >
                Salvar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {campos(form, (patch) => setForm((f) => (f ? { ...f, ...patch } : f)))}
            {erro && <p role="alert" className="text-sm text-[#ff6b7f]">{erro}</p>}
          </div>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!apagar}
        onClose={() => setApagar(null)}
        onConfirm={() => apagar && excluirM.mutate(apagar)}
        loading={excluirM.isPending}
        perigo
        titulo={`Excluir ${apagar ? rotulo(apagar) : ""}?`}
        confirmar="Excluir"
      />
    </div>
  );
}
