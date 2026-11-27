"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { useMarca } from "@/components/brand/marca";
import { RoleGuard } from "@/components/layout/role-guard";
import { Button } from "@/components/ui/button";
import { SkeletonLista } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { PLANOS, precoProfissionalPorQuantidade, PRODUTO } from "@/lib/planos";
import { formatBRL } from "@/lib/format";
import { PAPEL_HOME } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { getAssinatura, solicitarEstabelecimentos } from "@/services/plataforma.service";
import { useSession } from "@/stores/session";

const STATUS: Record<string, string> = {
  trial: "Período de teste",
  ativo: "Assinatura ativa",
  suspenso: "Suspensa",
  cancelado: "Cancelada",
};

const data = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

export default function AssinaturaPage() {
  return (
    <RoleGuard papeis={["admin", "caixa", "garcom", "cozinha", "bar"]}>
      <Conteudo />
    </RoleGuard>
  );
}

function Conteudo() {
  const marca = useMarca();
  const usuario = useSession((s) => s.usuario);
  const qc = useQueryClient();
  const [quantidadeEstabelecimentos, setQuantidadeEstabelecimentos] = useState(1);
  const q = useQuery({ queryKey: ["assinatura"], queryFn: getAssinatura });
  const a = q.data;
  const totalProfissional = precoProfissionalPorQuantidade(quantidadeEstabelecimentos);
  const solicitacao = useMutation({
    mutationFn: () => solicitarEstabelecimentos(quantidadeEstabelecimentos),
    onSuccess: (resultado) => {
      toast.success(`Solicitação registrada: ${resultado.quantidade} ${resultado.quantidade === 1 ? "estabelecimento" : "estabelecimentos"}.`);
      void qc.invalidateQueries({ queryKey: ["assinatura"] });
    },
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Não foi possível enviar a solicitação."),
  });

  const msgWhats = encodeURIComponent(
    `Olá! Quero ${a?.status === "trial" ? "assinar" : "renovar"} o ${PRODUTO.nome} para ${quantidadeEstabelecimentos} ${quantidadeEstabelecimentos === 1 ? "estabelecimento" : "estabelecimentos"} (${marca?.nome ?? "meu negócio"}, ${marca?.slug}). Total estimado do Profissional: ${formatBRL(totalProfissional)}/mês.`,
  );

  return (
    <main className="bg-pub min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          {a?.liberado && usuario ? (
            <Link href={PAPEL_HOME[usuario.papel]} className="inline-flex items-center gap-2 text-sm text-muted hover:text-cream">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          ) : (
            <span />
          )}
          <Logo compacto />
        </div>

        <h1 className="mt-8 font-display text-5xl leading-none">Assinatura</h1>
        {q.isLoading && <SkeletonLista linhas={3} className="mt-6" />}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}

        {a && (
          <>
            <section className={cn("mt-6 rounded-card border p-5", a.liberado ? "border-line bg-surface" : "border-red/60 bg-red-soft")}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Plano atual</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{STATUS[a.status] ?? a.status}</p>
              <p className="mt-2 text-2xl font-semibold">
                Plano {a.planoNome} · {formatBRL(a.precoMensal)}/mês
              </p>
              {!a.liberado && (
                <p className="mt-2 text-cream">{a.motivo} O sistema volta a funcionar assim que o pagamento for confirmado.</p>
              )}
              {a.liberado && a.status === "trial" && (
                <p className="mt-2 text-muted">
                  Seu teste vai até <b className="text-cream">{data(a.trialAte)}</b>
                  {a.diasRestantes !== null && (
                    <> ({a.diasRestantes} {a.diasRestantes === 1 ? "dia" : "dias"})</>
                  )}
                  . Tudo liberado até lá.
                </p>
              )}
              {a.liberado && a.status === "ativo" && a.pagoAte && (
                <p className="mt-2 text-muted">
                  Pago até <b className="text-cream">{data(a.pagoAte)}</b>.
                </p>
              )}
            </section>

            <section className="mt-6 rounded-card border border-line bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Simulação</p>
              <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block">
                  <span className="text-sm font-medium">Quantidade de estabelecimentos</span>
                  <select
                    aria-label="Quantidade de estabelecimentos"
                    value={quantidadeEstabelecimentos}
                    onChange={(e) => setQuantidadeEstabelecimentos(Number(e.target.value))}
                    className="mt-2 h-12 w-full rounded-[10px] border border-line bg-bg px-3 text-cream outline-none focus:border-gold sm:max-w-xs"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "estabelecimento" : "estabelecimentos"}</option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs text-muted">No Profissional: 1 estabelecimento por R$ 139/mês; 2 por R$ 259/mês; da terceira em diante, cada estabelecimento adicional soma R$ 120/mês.</span>
                </label>
                <div className="sm:text-right">
                  <p className="text-sm text-muted">Total mensal estimado · Profissional</p>
                  <p className="mt-1 text-3xl font-semibold">{formatBRL(totalProfissional)}<span className="text-sm font-normal text-muted">/mês</span></p>
                </div>
              </div>
              <p className="mt-3 text-xs text-subtle">A quantidade e o valor serão confirmados com a equipe antes de incluir outros estabelecimentos na assinatura.</p>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2">
              {Object.values(PLANOS).map((p) => (
                <div key={p.id} className={cn("rounded-card border bg-surface p-5", p.id === a.plano ? "border-gold" : "border-line")}>
                  <div className="flex items-baseline justify-between">
                    <p className="font-display text-3xl">{p.nome}</p>
                    {p.id === a.plano && <span className="text-xs font-semibold text-gold">SEU PLANO</span>}
                  </div>
                  <p className="mt-1 text-xl font-semibold">
                    {formatBRL(p.precoMensal)}
                    <span className="text-sm font-normal text-muted">/mês</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted">
                    {p.itens.map((i) => (
                      <li key={i} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section className="mt-6 rounded-card border border-line bg-bg-soft p-5">
              <p className="font-semibold">Contratar ou solicitar inclusão</p>
              <p className="mt-1 text-sm text-muted">
                {solicitacao.data
                  ? "Solicitação enviada para análise. Ela não altera a assinatura nem libera acesso a outros estabelecimentos; a equipe confirmará os próximos passos."
                  : quantidadeEstabelecimentos === 1
                    ? "Envie seu pedido de contratação. A equipe confirmará o valor e as instruções de pagamento antes de ativar a assinatura."
                    : "Solicite a inclusão de estabelecimentos. A simulação não muda seu acesso: a equipe confirma a possibilidade, o valor e a ativação depois de validar os acessos por loja."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {usuario?.papel === "admin" && (
                  <Button loading={solicitacao.isPending} onClick={() => solicitacao.mutate()}>
                    {quantidadeEstabelecimentos === 1 ? "Contratar" : `Solicitar inclusão de ${quantidadeEstabelecimentos - 1} ${quantidadeEstabelecimentos === 2 ? "estabelecimento" : "estabelecimentos"}`}
                  </Button>
                )}
                {a.pixChave && quantidadeEstabelecimentos === 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText(a.pixChave!);
                      toast.success("Chave Pix copiada");
                    }}
                  >
                    <Copy className="h-4 w-4" /> Copiar chave Pix
                  </Button>
                )}
                {a.whatsapp && (
                  <a
                    href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}?text=${msgWhats}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-gold px-4 text-sm font-semibold text-bg"
                  >
                    <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                  </a>
                )}
                {!a.whatsapp && <p className="text-sm text-subtle">Contato comercial não configurado. Envie sua solicitação acima para a equipe.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
