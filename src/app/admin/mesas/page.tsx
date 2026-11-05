"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Pencil, Plus, Printer, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { MesaQR } from "@/components/admin/mesa-qr";
import { excluirMesa, listarMesas, salvarMesa } from "@/services/mesas.service";
import { mensagemErro } from "@/lib/errors";
import type { Mesa } from "@/types";

type F = Omit<Mesa, "id"> & { id?: string };

export default function MesasAdmin() {
  const q = useQuery({ queryKey: ["mesas"], queryFn: listarMesas });
  const [form, setForm] = useState<F | null>(null);
  const [apagar, setApagar] = useState<Mesa | null>(null);
  const ativas = (q.data ?? []).filter((m) => m.ativa);

  const salvar = useMutation({
    mutationFn: (f: F) => salvarMesa(f),
    onSuccess: () => {
      toast.success("Mesa salva");
      setForm(null);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => excluirMesa(id),
    onSuccess: () => {
      toast.success("Mesa removida");
      setApagar(null);
    },
    onError: (e) => {
      toast.error(mensagemErro(e));
      setApagar(null);
    },
  });

  return (
    <div>
      <PageHeader
        descricao={`${ativas.length} mesas ativas. Cada QR leva o cliente direto para o cardápio da mesa.`}
        acoes={
          <>
            <Link href="/imprimir/qr" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm hover:bg-surface-2">
              <Printer className="h-4 w-4" /> Imprimir QR codes
            </Link>
            <Button onClick={() => setForm({ numero: (Math.max(0, ...ativas.map((m) => m.numero)) || 0) + 1, lugares: 4, ativa: true })}>
              <Plus className="h-4 w-4" /> Nova mesa
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {q.isLoading && Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-64" />)}
        {ativas.map((m) => (
          <Card key={m.id} className="flex flex-col items-center p-4">
            <div className="flex w-full items-center justify-between">
              <span className="font-display text-3xl text-gold">Mesa {m.numero}</span>
              <span className="flex items-center gap-1 text-xs text-muted"><Users className="h-3.5 w-3.5" />{m.lugares}</span>
            </div>
            <div className="mt-3 rounded-lg bg-cream p-2">
              <MesaQR numero={m.numero} tamanho={110} />
            </div>
            <div className="mt-3 flex w-full justify-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Copiar link"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/m/${m.numero}`);
                  toast.success("Link copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Link href={`/m/${m.numero}`} target="_blank" aria-label="Abrir cardápio da mesa" className="grid h-9 w-9 place-items-center rounded-[10px] hover:bg-surface-2">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Button size="icon-sm" variant="ghost" aria-label={`Editar mesa ${m.numero}`} onClick={() => setForm({ ...m })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label={`Excluir mesa ${m.numero}`} onClick={() => setApagar(m)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {form && (
        <Dialog
          open
          onClose={() => setForm(null)}
          titulo={form.id ? `Editar mesa ${form.numero}` : "Nova mesa"}
          largura="sm"
          rodape={
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setForm(null)}>Cancelar</Button>
              <Button block loading={salvar.isPending} disabled={form.numero < 1 || form.lugares < 1} onClick={() => salvar.mutate(form)}>Salvar</Button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número" htmlFor="m-num">
              <Input id="m-num" type="number" min={1} value={form.numero} onChange={(e) => setForm({ ...form, numero: Number(e.target.value) })} />
            </Field>
            <Field label="Lugares" htmlFor="m-lug">
              <Input id="m-lug" type="number" min={1} value={form.lugares} onChange={(e) => setForm({ ...form, lugares: Number(e.target.value) })} />
            </Field>
          </div>
          {form.id && <p className="mt-3 text-xs text-subtle">Mudar o número muda o link do QR. Reimprima o QR desta mesa.</p>}
        </Dialog>
      )}
      <ConfirmDialog
        open={!!apagar}
        onClose={() => setApagar(null)}
        onConfirm={() => apagar && del.mutate(apagar.id)}
        loading={del.isPending}
        perigo
        titulo={`Remover a mesa ${apagar?.numero}?`}
        descricao="O QR impresso desta mesa deixa de funcionar."
        confirmar="Remover"
      />
    </div>
  );
}
