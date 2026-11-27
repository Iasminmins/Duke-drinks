"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, LogOut, MessageCircle } from "lucide-react";
import { Coroa } from "@/components/brand/coroa";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SkeletonLista } from "@/components/ui/skeleton";
import { urlDoTenant } from "@/lib/host";
import { mensagemErro } from "@/lib/errors";
import { formatBRL, formatarCelular } from "@/lib/format";
import { PLANOS, PRODUTO, receitaProfissionalPorGrupos, plano as planoDe } from "@/lib/planos";
import { cn } from "@/lib/utils";
import {
  plataformaAtualizar,
  plataformaAtualizarSolicitacao,
  plataformaEntrar,
  plataformaListar,
  plataformaListarSolicitacoes,
  plataformaSair,
  plataformaSessao,
  plataformaVincularEstabelecimento,
  type NegocioResumo,
} from "@/services/plataforma.service";

const data = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const paraInput = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : "");

const COR_STATUS: Record<string, string> = {
  trial: "bg-info-soft text-info",
  ativo: "bg-ok-soft text-ok",
  suspenso: "bg-warn-soft text-warn",
  cancelado: "bg-red-soft text-red",
};

export default function PlataformaPage() {
  const sessao = useQuery({ queryKey: ["plat-sessao"], queryFn: plataformaSessao });
  if (sessao.isLoading) return <main className="p-8"><SkeletonLista /></main>;
  return sessao.data ? <Painel /> : <Entrar />;
}

function Entrar() {
  const qc = useQueryClient();
  const [senha, setSenha] = useState("");
  const m = useMutation({
    mutationFn: () => plataformaEntrar(senha),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plat-sessao"] }),
    onError: (e) => toast.error(mensagemErro(e)),
  });
  return (
    <main className="bg-pub grid min-h-dvh place-items-center px-4">
      <form
        className="w-full max-w-sm rounded-2xl border border-line bg-bg-soft p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (senha) m.mutate();
        }}
      >
        <p className="flex items-center gap-2 font-display text-2xl">
          <Coroa className="h-4 w-6 text-gold" /> {PRODUTO.nome}
        </p>
        <h1 className="mt-4 font-display text-3xl">Painel da plataforma</h1>
        <Field label="Senha" htmlFor="p-senha" className="mt-6">
          <Input id="p-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
        </Field>
        <Button type="submit" block className="mt-6" loading={m.isPending}>
          Entrar
        </Button>
      </form>
    </main>
  );
}

function Painel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["plat-negocios"], queryFn: plataformaListar });
  const solicitacoesQ = useQuery({ queryKey: ["plat-solicitacoes"], queryFn: plataformaListarSolicitacoes });
  const [editando, setEditando] = useState<NegocioResumo | null>(null);
  const [destinosVinculo, setDestinosVinculo] = useState<Record<string, string>>({});
  const sair = useMutation({
    mutationFn: plataformaSair,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plat-sessao"] }),
  });
  const atualizarSolicitacao = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "em_contato" | "resolvida" }) => plataformaAtualizarSolicitacao(id, status),
    onSuccess: async () => {
      toast.success("Solicitação atualizada");
      await qc.invalidateQueries({ queryKey: ["plat-solicitacoes"] });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const vincularEstabelecimento = useMutation({
    mutationFn: ({ solicitacaoId, estabelecimentoId }: { solicitacaoId: string; estabelecimentoId: string }) =>
      plataformaVincularEstabelecimento(solicitacaoId, estabelecimentoId),
    onSuccess: async (total) => {
      toast.success(`${total} estabelecimentos vinculados ao grupo`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["plat-solicitacoes"] }),
        qc.invalidateQueries({ queryKey: ["plat-negocios"] }),
      ]);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const lista = q.data ?? [];
  const pagantes = lista.filter((n) => n.status === "ativo");
  const mrr = receitaProfissionalPorGrupos(pagantes);

  return (
    <main className="min-h-dvh bg-bg px-4 py-6 lg:px-8">
      <header className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-2xl">
          <Coroa className="h-4 w-6 text-gold" /> {PRODUTO.nome} · plataforma
        </p>
        <Button variant="ghost" size="sm" onClick={() => sair.mutate()}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Negócios", String(lista.length)],
          ["Em teste", String(lista.filter((n) => n.status === "trial").length)],
          ["Pagantes", String(pagantes.length)],
          ["Receita mensal", formatBRL(mrr)],
        ].map(([t, v]) => (
          <div key={t} className="rounded-card border border-line bg-surface p-4">
            <p className="text-xs uppercase tracking-wider text-subtle">{t}</p>
            <p className="mt-1 font-display text-3xl">{v}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Solicitações de assinatura</h2>
            <p className="text-sm text-muted">Pedidos de contratação e inclusão de estabelecimentos aguardando retorno.</p>
          </div>
          <span className="rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-gold">{solicitacoesQ.data?.length ?? 0} abertas</span>
        </div>
        {solicitacoesQ.isLoading && <SkeletonLista className="mt-4" />}
        {solicitacoesQ.isError && <p className="mt-4 text-sm text-red">Não foi possível carregar as solicitações.</p>}
        {solicitacoesQ.data?.length === 0 && <p className="mt-4 text-sm text-muted">Nenhuma solicitação pendente.</p>}
        {!!solicitacoesQ.data?.length && <div className="mt-4 divide-y divide-line">
          {solicitacoesQ.data.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{s.nome} · {s.quantidade} {s.quantidade === 1 ? "estabelecimento" : "estabelecimentos"}</p>
                <p className="text-sm text-muted">{s.slug} · {s.responsavelNome ?? "Responsável não informado"} · {formatBRL(s.valorMensal)}/mês</p>
                <p className="text-xs text-subtle">{s.responsavelEmail ?? ""}{s.responsavelCelular ? ` · ${formatarCelular(s.responsavelCelular)}` : ""} · {data(s.criadaEm)}</p>
                <p className="mt-1 text-xs text-muted">Lojas vinculadas: {s.estabelecimentosNoGrupo} de {s.quantidade}</p>
              </div>
              {s.estabelecimentosNoGrupo < s.quantidade && s.responsavelEmail && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Loja para vincular à solicitação de ${s.nome}`}
                    value={destinosVinculo[s.id] ?? ""}
                    onChange={(e) => setDestinosVinculo((atual) => ({ ...atual, [s.id]: e.target.value }))}
                    className="h-9 min-w-44 rounded-lg border border-line bg-bg px-2 text-sm"
                  >
                    <option value="">Selecionar loja existente</option>
                    {lista.filter((n) => n.id !== s.tenantId && n.estabelecimentosNoGrupo === 1 && n.responsavelEmail?.toLowerCase() === s.responsavelEmail?.toLowerCase()).map((n) => (
                      <option key={n.id} value={n.id}>{n.nome} · {n.slug}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="secondary" disabled={!destinosVinculo[s.id]} loading={vincularEstabelecimento.isPending} onClick={() => {
                    const estabelecimentoId = destinosVinculo[s.id];
                    if (estabelecimentoId) vincularEstabelecimento.mutate({ solicitacaoId: s.id, estabelecimentoId });
                  }}>Vincular</Button>
                </div>
              )}
              {s.status === "pendente" ? (
                <Button size="sm" variant="secondary" loading={atualizarSolicitacao.isPending} onClick={() => atualizarSolicitacao.mutate({ id: s.id, status: "em_contato" })}>
                  Marcar contato
                </Button>
              ) : (
                <Button size="sm" variant="secondary" disabled={s.estabelecimentosNoGrupo < s.quantidade} loading={atualizarSolicitacao.isPending} onClick={() => atualizarSolicitacao.mutate({ id: s.id, status: "resolvida" })}>
                  Concluir
                </Button>
              )}
            </div>
          ))}
        </div>}
      </section>

      {q.isLoading && <SkeletonLista className="mt-6" />}
      {q.isError && <p className="mt-6 text-red">{mensagemErro(q.error)}</p>}

      <div className="mt-6 overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-bg-soft text-left text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-4 py-3">Negócio</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Teste / pago até</th>
              <th className="px-4 py-3">Uso (30 dias)</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista.map((n) => (
              <tr key={n.id} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold">{n.nome}</p>
                  <a href={urlDoTenant(n.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold">
                    {n.slug} <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-subtle">{n.tipo} · desde {data(n.criadoEm)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", COR_STATUS[n.status])}>{n.status}</span>
                </td>
                <td className="px-4 py-3">{planoDe(n.plano).nome}</td>
                <td className="px-4 py-3">{n.status === "trial" ? data(n.trialAte) : data(n.pagoAte)}</td>
                <td className="px-4 py-3">
                  {n.comandas30d} comandas
                  <p className="text-xs text-subtle">último pedido: {data(n.ultimoPedido)}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{n.responsavelNome ?? "—"}</p>
                  <p className="text-xs text-subtle">{n.responsavelEmail}</p>
                  {n.responsavelCelular && (
                    <a
                      href={`https://wa.me/55${n.responsavelCelular}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold"
                    >
                      <MessageCircle className="h-3 w-3" /> {formatarCelular(n.responsavelCelular)}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="secondary" onClick={() => setEditando(n)}>
                    Gerenciar
                  </Button>
                </td>
              </tr>
            ))}
            {q.isSuccess && !lista.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Nenhum negócio cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && <Gerenciar negocio={editando} onClose={() => setEditando(null)} />}
    </main>
  );
}

function Gerenciar({ negocio, onClose }: { negocio: NegocioResumo; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    status: negocio.status,
    plano: negocio.plano,
    pagoAte: paraInput(negocio.pagoAte),
    trialAte: paraInput(negocio.trialAte),
    observacao: negocio.observacao,
  });
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }));
  const m = useMutation({
    mutationFn: () =>
      plataformaAtualizar(negocio.id, {
        status: f.status,
        plano: f.plano,
        pagoAte: f.pagoAte || null,
        trialAte: f.trialAte || null,
        observacao: f.observacao,
      }),
    onSuccess: () => {
      toast.success("Negócio atualizado");
      void qc.invalidateQueries({ queryKey: ["plat-negocios"] });
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  /** atalho do dia a dia: recebeu o Pix, libera mais um mês */
  function confirmarPagamento() {
    const base = f.pagoAte && new Date(f.pagoAte) > new Date() ? new Date(f.pagoAte + "T12:00:00") : new Date();
    base.setMonth(base.getMonth() + 1);
    set({ status: "ativo", pagoAte: base.toLocaleDateString("sv-SE") });
  }

  return (
    <Dialog open onClose={onClose} titulo={negocio.nome}>
      <div className="space-y-4">
        <Button variant="outline" block onClick={confirmarPagamento}>
          Recebi o pagamento: liberar +1 mês
        </Button>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Situação" htmlFor="g-status">
            <Select id="g-status" value={f.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="trial">Teste</option>
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </Field>
          <Field label="Plano" htmlFor="g-plano">
            <Select id="g-plano" value={f.plano} onChange={(e) => set({ plano: e.target.value })}>
              {Object.values(PLANOS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({formatBRL(p.precoMensal)})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Teste até" htmlFor="g-trial">
            <Input id="g-trial" type="date" value={f.trialAte} onChange={(e) => set({ trialAte: e.target.value })} />
          </Field>
          <Field label="Pago até" htmlFor="g-pago">
            <Input id="g-pago" type="date" value={f.pagoAte} onChange={(e) => set({ pagoAte: e.target.value })} />
          </Field>
        </div>
        <Field label="Anotações" htmlFor="g-obs">
          <Textarea id="g-obs" value={f.observacao} onChange={(e) => set({ observacao: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending}>
            Salvar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
