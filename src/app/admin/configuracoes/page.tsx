"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SkeletonLista } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Logo } from "@/components/brand/logo";
import { getEstabelecimento, resetarDemo, salvarEstabelecimento } from "@/services/config.service";
import { mensagemErro } from "@/lib/errors";
import type { Estabelecimento } from "@/types";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  taxaServicoPadrao: z.number().min(0, "Mínimo 0%").max(20, "Máximo 20%"),
  horarioFuncionamento: z.string().trim().min(3, "Informe o horário"),
  mensagemTopo: z.string().trim().max(80, "Máximo 80 caracteres"),
  endereco: z.string().trim(),
});

export default function ConfiguracoesPage() {
  const q = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });
  const [f, setF] = useState<Estabelecimento | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [reset, setReset] = useState(false);
  useEffect(() => {
    if (q.data && !f) setF(q.data);
  }, [q.data, f]);

  const salvar = useMutation({
    mutationFn: () => salvarEstabelecimento(f!),
    onSuccess: () => toast.success("Configurações salvas"),
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const resetM = useMutation({
    mutationFn: resetarDemo,
    onSuccess: () => {
      toast.success("Dados restaurados");
      setReset(false);
      setF(null);
    },
    onError: (e) => {
      setReset(false);
      toast.error(mensagemErro(e));
    },
  });

  if (!f) return <SkeletonLista />;
  const set = (patch: Partial<Estabelecimento>) => setF({ ...f, ...patch });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader><CardTitle>Estabelecimento</CardTitle></CardHeader>
        <form
          className="grid gap-4 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = schema.safeParse(f);
            if (!r.success) {
              setErros(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
              return;
            }
            setErros({});
            salvar.mutate();
          }}
        >
          <Field label="Nome do estabelecimento" htmlFor="e-nome" erro={erros.nome} className="sm:col-span-2">
            <Input id="e-nome" value={f.nome} onChange={(e) => set({ nome: e.target.value })} />
          </Field>
          <Field label="Taxa de serviço padrão (%)" htmlFor="e-taxa" erro={erros.taxaServicoPadrao} dica="O caixa pode desligar a taxa por comanda.">
            <Input id="e-taxa" type="number" min={0} max={20} step={0.5} value={f.taxaServicoPadrao} onChange={(e) => set({ taxaServicoPadrao: Number(e.target.value) })} />
          </Field>
          <Field label="Horário de funcionamento" htmlFor="e-hora" erro={erros.horarioFuncionamento}>
            <Input id="e-hora" value={f.horarioFuncionamento} onChange={(e) => set({ horarioFuncionamento: e.target.value })} />
          </Field>
          <Field label="Mensagem do topo do cardápio" htmlFor="e-msg" erro={erros.mensagemTopo} dica={`${f.mensagemTopo.length}/80`} className="sm:col-span-2">
            <Input id="e-msg" maxLength={80} value={f.mensagemTopo} onChange={(e) => set({ mensagemTopo: e.target.value })} />
          </Field>
          <Field label="Endereço" htmlFor="e-end" className="sm:col-span-2">
            <Textarea id="e-end" value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} />
          </Field>
          <Field label="Logo" htmlFor="e-logo" className="sm:col-span-2" dica="Coloque o arquivo em /public/brand e aponte em src/lib/brand.ts (o upload real entra com o back-end).">
            <div className="flex items-center gap-4 rounded-card border border-dashed border-line p-4">
              <Logo />
            </div>
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" loading={salvar.isPending}>Salvar alterações</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-6">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-subtle">Prévia do topo do cardápio</p>
          <div className="bg-pub mt-3 rounded-card border border-line p-4">
            <p className="font-display text-2xl leading-tight">{f.mensagemTopo || "—"}</p>
            <p className="mt-2 text-xs text-muted">{f.horarioFuncionamento}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="font-semibold">Apagar movimento</p>
          <p className="mt-1 text-sm text-muted">Apaga comandas, pedidos, pagamentos e caixas. Cardápio, mesas e usuários ficam. Só funciona se o servidor permitir (ALLOW_DEMO_RESET).</p>
          <Button variant="secondary" className="mt-4" onClick={() => setReset(true)}>
            <RefreshCw className="h-4 w-4" /> Apagar movimento
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={reset}
        onClose={() => setReset(false)}
        onConfirm={() => resetM.mutate()}
        loading={resetM.isPending}
        perigo
        titulo="Apagar todo o movimento?"
        descricao="Todas as comandas, pedidos, pagamentos e caixas serão apagados do banco. Isso não pode ser desfeito."
        confirmar="Apagar tudo"
      />
    </div>
  );
}
