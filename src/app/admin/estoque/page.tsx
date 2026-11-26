"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { listarEstoque, listarMovimentosEstoque, movimentarEstoque, type MotivoMovimentoEstoque } from "@/services/balcao.service";
import { getEstabelecimento } from "@/services/config.service";
import { formatDataHora } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import Link from "next/link";
import { useSession } from "@/stores/session";

const MOTIVOS: Record<MotivoMovimentoEstoque, string> = {
  saldo_inicial: "Saldo inicial",
  compra: "Compra/recebimento",
  devolucao: "Devolução",
  venda_balcao: "Venda de balcão",
  perda: "Perda",
  vencimento: "Vencimento",
  consumo_interno: "Consumo interno",
  quebra: "Quebra/avaria",
  contagem: "Contagem de estoque",
  outro: "Outro",
};
const MOTIVOS_POR_TIPO: Record<"entrada" | "saida" | "ajuste", MotivoMovimentoEstoque[]> = {
  entrada: ["compra", "devolucao", "outro"],
  saida: ["perda", "vencimento", "consumo_interno", "quebra", "outro"],
  ajuste: ["contagem", "outro"],
};

export default function EstoquePage() {
  const qc = useQueryClient();
  const papel = useSession((s) => s.usuario?.papel);
  const produtosQ = useQuery({ queryKey: ["estoque"], queryFn: listarEstoque });
  const estQ = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });
  const movsQ = useQuery({ queryKey: ["movimentos-estoque"], queryFn: listarMovimentosEstoque });
  const [busca, setBusca] = useState("");
  const [qtd, setQtd] = useState<Record<string, string>>({});
  const [tipo, setTipo] = useState<Record<string, "entrada" | "saida" | "ajuste">>({});
  const [motivo, setMotivo] = useState<Record<string, MotivoMovimentoEstoque>>({});
  const [nota, setNota] = useState<Record<string, string>>({});
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [tipoHistorico, setTipoHistorico] = useState("");
  const [motivoHistorico, setMotivoHistorico] = useState("");
  const m = useMutation({
    mutationFn: (produtoId: string) => movimentarEstoque({ produtoId, tipo: tipo[produtoId] ?? "entrada", motivo: motivo[produtoId] ?? "compra", quantidade: Number(qtd[produtoId]), observacao: nota[produtoId] }),
    onSuccess: (_, id) => { toast.success("Estoque atualizado"); setQtd((x) => ({ ...x, [id]: "" })); setNota((x) => ({ ...x, [id]: "" }));
      void qc.invalidateQueries({ queryKey: ["estoque"] }); void qc.invalidateQueries({ queryKey: ["movimentos-estoque"] }); void qc.invalidateQueries({ queryKey: ["produtos-balcao"] }); },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const rows = (produtosQ.data ?? []).filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigoBarras ?? "").includes(busca));
  const movimentos = (movsQ.data ?? []).filter((x) => {
    const termo = buscaHistorico.trim().toLocaleLowerCase("pt-BR");
    const correspondeBusca = !termo || [x.produtoNome, x.observacao, x.usuarioNome, MOTIVOS[x.motivo]].some((v) => v.toLocaleLowerCase("pt-BR").includes(termo));
    return correspondeBusca && (!tipoHistorico || x.tipo === tipoHistorico) && (!motivoHistorico || x.motivo === motivoHistorico);
  });

  if (estQ.data && !estQ.data.modulos?.estoque) return <div className="mx-auto max-w-xl pt-10"><EmptyState titulo="Estoque desativado" descricao="Ative Gestão de estoque em Admin → Configurações → Recursos deste estabelecimento." /></div>;
  if (produtosQ.isError) return <ErrorState onRetry={() => produtosQ.refetch()} />;
  return <div>
    <PageHeader descricao="Acompanhe saldos, alertas de reposição e registre entradas, saídas ou contagens." />
    <Card className="mb-4 flex items-center gap-2 p-3"><Search className="h-4 w-4 text-subtle" /><Input aria-label="Buscar produto ou código" placeholder="Buscar produto ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />{busca && <Button variant="secondary" size="sm" onClick={() => setBusca("")}>Limpar busca</Button>}</Card>
    {produtosQ.data?.length === 0 ? <Card className="p-6"><EmptyState titulo="Cadastre um produto para começar a controlar o estoque" descricao="Depois, ative o controle de estoque no cadastro e informe o saldo inicial." />{papel === "admin" && <div className="mt-4 text-center"><Link href="/admin/produtos" className="inline-flex h-10 items-center rounded-[10px] bg-gold px-4 text-sm font-semibold text-bg">Cadastrar produto</Link></div>}</Card> : null}
    {produtosQ.data && produtosQ.data.length > 0 && rows.length === 0 && <Card className="mb-4 p-5 text-center text-sm text-muted">Nenhum produto corresponde à busca. <button className="ml-2 font-semibold text-gold underline" onClick={() => setBusca("")}>Limpar busca</button></Card>}
    {!!produtosQ.data?.length && !!rows.length && <Card className="overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase text-subtle"><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Mínimo</th><th className="px-4 py-3">Movimentar</th><th className="px-4 py-3">Observação</th><th className="px-4 py-3" /></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((p) => <tr key={p.id} className={(p.estoque ?? 0) <= (p.estoqueMinimo ?? 0) ? "bg-warn-soft/30" : ""}>
          <td className="px-4 py-3"><b>{p.nome}</b><small className="block text-subtle">{p.codigoBarras || "Sem código"}</small></td>
          <td className="px-4 py-3 font-semibold tabular-nums">{p.estoque ?? 0} {p.unidade ?? "un"}</td><td className="px-4 py-3">{p.estoqueMinimo ?? 0} {p.unidade ?? "un"}</td>
          <td className="flex min-w-56 flex-col gap-2 px-4 py-3"><Select aria-label={`Tipo de movimentação de ${p.nome}`} value={tipo[p.id] ?? "entrada"} onChange={(e) => {
            const novoTipo = e.target.value as "entrada" | "saida" | "ajuste";
            setTipo((x) => ({ ...x, [p.id]: novoTipo }));
            setMotivo((x) => ({ ...x, [p.id]: MOTIVOS_POR_TIPO[novoTipo][0] }));
          }}>
            <option value="entrada">Entrada</option><option value="saida">Saída</option><option value="ajuste">Definir saldo</option></Select>
            <Select aria-label={`Motivo da movimentação de ${p.nome}`} value={motivo[p.id] ?? "compra"} onChange={(e) => setMotivo((x) => ({ ...x, [p.id]: e.target.value as MotivoMovimentoEstoque }))}>
              {MOTIVOS_POR_TIPO[tipo[p.id] ?? "entrada"].map((opcao) => <option key={opcao} value={opcao}>{MOTIVOS[opcao]}</option>)}
            </Select>
            <Input aria-label={`Quantidade para ${p.nome}`} type="number" min="0.001" step="0.001" placeholder="Qtd." value={qtd[p.id] ?? ""} onChange={(e) => setQtd((x) => ({ ...x, [p.id]: e.target.value }))} className="w-24" /></td>
          <td className="px-4 py-3"><Input placeholder="Observação (opcional)" value={nota[p.id] ?? ""} onChange={(e) => setNota((x) => ({ ...x, [p.id]: e.target.value }))} /></td>
          <td className="px-4 py-3"><Button size="sm" disabled={!Number(qtd[p.id]) || Number(qtd[p.id]) <= 0} loading={m.isPending} onClick={() => m.mutate(p.id)}>{(tipo[p.id] ?? "entrada") === "saida" ? <ArrowUpFromLine className="h-4 w-4" /> : (tipo[p.id] ?? "entrada") === "ajuste" ? <Boxes className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />} Salvar</Button></td>
        </tr>)}</tbody>
      </table></div>
    </Card>}
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-2xl">Movimentações recentes</h2><p className="text-xs text-subtle">Últimas 100 movimentações</p></div>
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Buscar movimentação" placeholder="Produto, motivo ou funcionário" value={buscaHistorico} onChange={(e) => setBuscaHistorico(e.target.value)} className="w-64" />
          <Select aria-label="Filtrar por tipo" value={tipoHistorico} onChange={(e) => setTipoHistorico(e.target.value)} className="w-36">
            <option value="">Todos os tipos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="ajuste">Ajustes</option>
          </Select>
          <Select aria-label="Filtrar por motivo" value={motivoHistorico} onChange={(e) => setMotivoHistorico(e.target.value)} className="w-44">
            <option value="">Todos os motivos</option>{Object.entries(MOTIVOS).map(([chave, rotulo]) => <option key={chave} value={chave}>{rotulo}</option>)}
          </Select>
          {(buscaHistorico || tipoHistorico || motivoHistorico) && <Button variant="secondary" size="sm" onClick={() => { setBuscaHistorico(""); setTipoHistorico(""); setMotivoHistorico(""); }}>Limpar filtros</Button>}
        </div>
      </div>
      <Card className="divide-y divide-line">
      {movimentos.map((x) => <div key={x.id} className="flex flex-wrap items-center gap-3 p-3 text-sm"><span className="min-w-36 text-xs text-subtle">{formatDataHora(x.criadoEm)}</span><b className="min-w-40 flex-1">{x.produtoNome}</b><span className="capitalize">{x.tipo} · {MOTIVOS[x.motivo]}</span><span>{x.quantidade}</span><span className="text-muted">{x.observacao || "—"} · {x.usuarioNome}</span></div>)}
      {!movsQ.data?.length && <p className="p-4 text-sm text-muted">Movimentações de estoque aparecem aqui.</p>}
      {!!movsQ.data?.length && !movimentos.length && <p className="p-4 text-sm text-muted">Nenhuma movimentação corresponde aos filtros.</p>}
    </Card></div>
  </div>;
}
