"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listarEstoque, listarMovimentosEstoque, movimentarEstoque } from "@/services/balcao.service";
import { getEstabelecimento } from "@/services/config.service";
import { formatDataHora } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";

export default function EstoquePage() {
  const qc = useQueryClient();
  const produtosQ = useQuery({ queryKey: ["estoque"], queryFn: listarEstoque });
  const estQ = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });
  const movsQ = useQuery({ queryKey: ["movimentos-estoque"], queryFn: listarMovimentosEstoque });
  const [busca, setBusca] = useState("");
  const [qtd, setQtd] = useState<Record<string, string>>({});
  const [tipo, setTipo] = useState<Record<string, "entrada" | "saida" | "ajuste">>({});
  const [nota, setNota] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: (produtoId: string) => movimentarEstoque({ produtoId, tipo: tipo[produtoId] ?? "entrada", quantidade: Number(qtd[produtoId]), observacao: nota[produtoId] }),
    onSuccess: (_, id) => { toast.success("Estoque atualizado"); setQtd((x) => ({ ...x, [id]: "" })); setNota((x) => ({ ...x, [id]: "" }));
      void qc.invalidateQueries({ queryKey: ["estoque"] }); void qc.invalidateQueries({ queryKey: ["movimentos-estoque"] }); void qc.invalidateQueries({ queryKey: ["produtos-balcao"] }); },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const rows = (produtosQ.data ?? []).filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigoBarras ?? "").includes(busca));

  if (estQ.data && !estQ.data.modulos?.estoque) return <div className="mx-auto max-w-xl pt-10"><EmptyState titulo="Estoque desativado" descricao="Ative Gestão de estoque em Admin → Configurações → Recursos deste estabelecimento." /></div>;
  return <div>
    <PageHeader descricao="Acompanhe saldos, alertas de reposição e registre entradas, saídas ou contagens." />
    <Card className="mb-4 flex items-center gap-2 p-3"><Search className="h-4 w-4 text-subtle" /><Input placeholder="Buscar produto ou código" value={busca} onChange={(e) => setBusca(e.target.value)} /></Card>
    <Card className="overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase text-subtle"><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Mínimo</th><th className="px-4 py-3">Movimentar</th><th className="px-4 py-3">Observação</th><th className="px-4 py-3" /></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((p) => <tr key={p.id} className={(p.estoque ?? 0) <= (p.estoqueMinimo ?? 0) ? "bg-warn-soft/30" : ""}>
          <td className="px-4 py-3"><b>{p.nome}</b><small className="block text-subtle">{p.codigoBarras || "Sem código"}</small></td>
          <td className="px-4 py-3 font-semibold tabular-nums">{p.estoque ?? 0} {p.unidade ?? "un"}</td><td className="px-4 py-3">{p.estoqueMinimo ?? 0} {p.unidade ?? "un"}</td>
          <td className="flex items-center gap-2 px-4 py-3"><Select aria-label={`Tipo de movimentação de ${p.nome}`} value={tipo[p.id] ?? "entrada"} onChange={(e) => setTipo((x) => ({ ...x, [p.id]: e.target.value as "entrada" | "saida" | "ajuste" }))}>
            <option value="entrada">Entrada</option><option value="saida">Saída</option><option value="ajuste">Definir saldo</option></Select>
            <Input aria-label={`Quantidade para ${p.nome}`} type="number" min="0.001" step="0.001" placeholder="Qtd." value={qtd[p.id] ?? ""} onChange={(e) => setQtd((x) => ({ ...x, [p.id]: e.target.value }))} className="w-24" /></td>
          <td className="px-4 py-3"><Input placeholder="Motivo/fornecedor" value={nota[p.id] ?? ""} onChange={(e) => setNota((x) => ({ ...x, [p.id]: e.target.value }))} /></td>
          <td className="px-4 py-3"><Button size="sm" disabled={!Number(qtd[p.id]) || Number(qtd[p.id]) <= 0} loading={m.isPending} onClick={() => m.mutate(p.id)}>{(tipo[p.id] ?? "entrada") === "saida" ? <ArrowUpFromLine className="h-4 w-4" /> : (tipo[p.id] ?? "entrada") === "ajuste" ? <Boxes className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />} Salvar</Button></td>
        </tr>)}</tbody>
      </table></div>
      {produtosQ.data && !rows.length && <p className="p-6 text-center text-sm text-muted">Nenhum produto corresponde à busca.</p>}
    </Card>
    <div className="mt-8"><h2 className="mb-3 font-display text-2xl">Movimentações recentes</h2><Card className="divide-y divide-line">
      {(movsQ.data ?? []).slice(0, 30).map((x) => <div key={x.id} className="flex flex-wrap items-center gap-3 p-3 text-sm"><span className="min-w-36 text-xs text-subtle">{formatDataHora(x.criadoEm)}</span><b className="min-w-40 flex-1">{x.produtoNome}</b><span className="capitalize">{x.tipo}</span><span>{x.quantidade}</span><span className="text-muted">{x.observacao || "—"} · {x.usuarioNome}</span></div>)}
      {!movsQ.data?.length && <p className="p-4 text-sm text-muted">Movimentações de estoque aparecem aqui.</p>}
    </Card></div>
  </div>;
}
