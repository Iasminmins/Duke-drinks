"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SkeletonLista } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getEstabelecimento, getEstadoFiscal, resetarDemo, salvarEstabelecimento } from "@/services/config.service";
import { mensagemErro } from "@/lib/errors";
import type { Estabelecimento } from "@/types";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  taxaServicoPadrao: z.number().min(0, "Mínimo 0%").max(20, "Máximo 20%"),
  horarioFuncionamento: z.string().trim().max(60, "Máximo 60 caracteres"),
  mensagemTopo: z.string().trim().max(80, "Máximo 80 caracteres"),
  endereco: z.string().trim(),
  fiscalCnpj: z.string().trim(),
  fiscalIe: z.string().trim(),
  fiscalUf: z.string().trim(),
  fiscalCodigoMunicipio: z.string().trim(),
  fiscalRegime: z.string().trim(),
  fiscalAmbiente: z.enum(["homologacao", "producao"]),
});

export default function ConfiguracoesPage() {
  const q = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });
  const fiscalQ = useQuery({ queryKey: ["estado-fiscal"], queryFn: getEstadoFiscal, enabled: !!q.data?.modulos?.nfce });
  const [f, setF] = useState<Estabelecimento | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [reset, setReset] = useState(false);
  useEffect(() => {
    if (q.data && !f) setF(q.data);
  }, [q.data, f]);

  const salvar = useMutation({
    mutationFn: () => salvarEstabelecimento({ ...f!, logoUrl: f!.logoUrl ?? null } as Estabelecimento),
    onSuccess: () => {
      toast.success("Configurações salvas");
      // logo e cor vêm do servidor no carregamento da página
      setTimeout(() => window.location.reload(), 600);
    },
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
          <Field label="Logo" htmlFor="e-logo" className="sm:col-span-2" dica="PNG, JPG, WEBP ou SVG de até 1 MB. De preferência com fundo transparente.">
            <div className="flex flex-wrap items-center gap-4 rounded-card border border-dashed border-line p-4">
              {f.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.logoUrl} alt="Logo" className="h-14 w-auto max-w-[180px] object-contain" />
              ) : (
                <span className="text-sm text-muted">Sem logo: o nome aparece no lugar.</span>
              )}
              <label className="ml-auto inline-flex h-10 cursor-pointer items-center rounded-[10px] border border-line px-3 text-sm hover:border-gold/50">
                Escolher imagem
                <input
                  id="e-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(e) => {
                    const arq = e.target.files?.[0];
                    e.target.value = "";
                    if (!arq) return;
                    if (arq.size > 1_000_000) {
                      toast.error("Imagem maior que 1 MB. Reduza e tente de novo.");
                      return;
                    }
                    const leitor = new FileReader();
                    leitor.onload = () => set({ logoUrl: String(leitor.result) });
                    leitor.readAsDataURL(arq);
                  }}
                />
              </label>
              {f.logoUrl && (
                <Button type="button" variant="secondary" onClick={() => set({ logoUrl: undefined })}>
                  Remover
                </Button>
              )}
            </div>
          </Field>
          <Field label="Cor da marca" htmlFor="e-cor" dica="Usada em botões, destaques e no cardápio do cliente.">
            <div className="flex items-center gap-3">
              <input
                id="e-cor"
                type="color"
                value={f.corPrimaria ?? "#f5b800"}
                onChange={(e) => set({ corPrimaria: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-[10px] border border-line bg-transparent"
              />
              <span className="font-mono text-sm text-muted">{f.corPrimaria ?? "#f5b800"}</span>
            </div>
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" loading={salvar.isPending}>Salvar alterações</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recursos deste estabelecimento</CardTitle></CardHeader>
        <div className="space-y-2 p-4">
          {([
            ["balcao", "Caixa de balcão", "Venda rápida por código de barras ou busca de produto."],
            ["estoque", "Gestão de estoque", "Entradas, saídas e saldo mínimo por produto."],
            ["nfce", "Emissão de NFC-e", "Emissão de cupom fiscal integrado à Focus NFe."],
          ] as const).map(([key, titulo, descricao]) => (
            <label key={key} className="flex items-center gap-4 rounded-lg border border-line p-3">
              <span className="flex-1"><b className="block text-sm">{titulo}</b><span className="text-xs text-subtle">{descricao}</span></span>
              <Switch checked={f.modulos?.[key] ?? false} onChange={(v) => {
                const atual = f.modulos ?? { balcao: false, estoque: false, nfce: false };
                const modulos = { ...atual, [key]: v };
                if (key === "nfce" && v) modulos.balcao = true;
                if (key === "balcao" && !v) modulos.nfce = false;
                set({ modulos });
              }} />
            </label>
          ))}
          <div className="flex justify-end pt-2"><Button loading={salvar.isPending} onClick={() => salvar.mutate()}>Salvar recursos</Button></div>
        </div>
      </Card>

      {f.modulos?.nfce && <Card>
        <CardHeader><CardTitle>Dados do emitente NFC-e</CardTitle></CardHeader>
        <div className="mx-4 mb-2 rounded-lg border border-line bg-bg-soft p-3 text-sm" role="status">
          {fiscalQ.isLoading ? "Verificando configuração fiscal…" : fiscalQ.data?.ausentes.length
            ? <><b className="text-warn">Configuração pendente.</b> Falta: {fiscalQ.data.ausentes.join(", ")}.</>
            : <><b className="text-ok">Dados preenchidos · {f.fiscalAmbiente === "producao" ? "Produção" : "Homologação"}.</b> Certificado digital e CSC precisam estar ativos e validados na Focus NFe.</>}
        </div>
        <form className="grid gap-4 p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
          <Field label="CNPJ" htmlFor="f-cnpj" dica="A Focus NFe precisa ter o certificado digital e credenciamento do emitente cadastrados.">
            <Input id="f-cnpj" inputMode="numeric" value={f.fiscalCnpj ?? ""} onChange={(e) => set({ fiscalCnpj: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Inscrição estadual" htmlFor="f-ie"><Input id="f-ie" value={f.fiscalIe ?? ""} onChange={(e) => set({ fiscalIe: e.target.value })} /></Field>
          <Field label="UF" htmlFor="f-uf"><Input id="f-uf" maxLength={2} value={f.fiscalUf ?? ""} onChange={(e) => set({ fiscalUf: e.target.value.toUpperCase() })} /></Field>
          <Field label="Código IBGE do município" htmlFor="f-ibge"><Input id="f-ibge" inputMode="numeric" value={f.fiscalCodigoMunicipio ?? ""} onChange={(e) => set({ fiscalCodigoMunicipio: e.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Regime tributário" htmlFor="f-regime" dica="Informe conforme o contador: 1 Simples Nacional, 2 Simples com excesso, 3 Regime normal.">
            <Select id="f-regime" value={f.fiscalRegime ?? ""} onChange={(e) => set({ fiscalRegime: e.target.value })}>
              <option value="">Selecione</option><option value="1">Simples Nacional</option><option value="2">Simples Nacional com excesso de sublimite</option><option value="3">Regime normal</option>
            </Select>
          </Field>
          <Field label="Ambiente" htmlFor="f-ambiente" dica="Comece em homologação. Produção só após validação do contador e credenciamento.">
            <Select id="f-ambiente" value={f.fiscalAmbiente ?? "homologacao"} onChange={(e) => set({ fiscalAmbiente: e.target.value as "homologacao" | "producao" })}>
              <option value="homologacao">Homologação (testes)</option><option value="producao">Produção</option>
            </Select>
          </Field>
          <p className="text-xs leading-relaxed text-subtle sm:col-span-2">Comece em homologação. Cadastre o certificado digital, o CSC e o emitente na conta da Focus NFe. A produção gera documentos fiscais válidos.</p>
          <div className="flex justify-end sm:col-span-2"><Button type="submit" loading={salvar.isPending}>Salvar dados fiscais</Button></div>
        </form>
      </Card>}

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
