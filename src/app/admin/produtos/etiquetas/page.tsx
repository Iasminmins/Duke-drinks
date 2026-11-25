"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { CodigoBarras } from "@/components/admin/codigo-barras";
import { getCardapioAdmin } from "@/services/cardapio.service";
import { formatBRL } from "@/lib/format";
import type { Produto } from "@/types";

export default function EtiquetasPage() {
  const q = useQuery({ queryKey: ["cardapio-admin"], queryFn: getCardapioAdmin });
  const produtos = useMemo(() => (q.data?.produtos ?? []).filter((p) => p.ativo && p.codigoBarras), [q.data]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [copias, setCopias] = useState<Record<string, number>>({});
  useEffect(() => {
    setSelecionados((atual) => atual.length ? atual.filter((id) => produtos.some((p) => p.id === id)) : produtos.map((p) => p.id));
  }, [produtos]);
  const etiquetas = produtos.filter((p) => selecionados.includes(p.id)).flatMap((p) =>
    Array.from({ length: Math.max(1, Math.min(100, copias[p.id] ?? 1)) }, (_, i) => ({ p, key: `${p.id}-${i}` })),
  );

  return <div>
    <style jsx global>{`@media print {
      @page { size: 50mm 30mm; margin: 0; }
      body * { visibility: hidden !important; }
      .etiquetas-print, .etiquetas-print * { visibility: visible !important; }
      .etiquetas-print { position: absolute; inset: 0 auto auto 0; width: 50mm; }
      .etiqueta { box-sizing: border-box; width: 50mm; height: 30mm; padding: 2mm 3mm; overflow: hidden; break-after: page; page-break-after: always; color: #000; background: #fff; }
      .etiqueta:last-child { break-after: auto; page-break-after: auto; }
    }`}</style>
    <div className="print:hidden">
      <h1 className="mb-2 font-display text-2xl font-bold">Etiquetas de produtos</h1>
      <PageHeader descricao="Selecione os produtos e imprima etiquetas com código de barras para usar no caixa." acoes={<Link href="/admin/produtos"><Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Produtos</Button></Link>} />
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-muted">{produtos.length} produto(s) com código · {etiquetas.length} etiqueta(s) selecionada(s). Para gerar novos códigos, edite o produto.</div>
        <Button disabled={!etiquetas.length} onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir etiquetas</Button>
      </Card>
      {q.isLoading && <Card className="p-5 text-sm text-muted">Carregando produtos…</Card>}
      {!q.isLoading && !produtos.length && <Card className="p-5 text-sm text-muted">Nenhum produto tem código ainda. Gere um código interno em Admin → Produtos → Editar produto.</Card>}
      <Card className="divide-y divide-line">
        {produtos.map((p) => <LinhaProduto key={p.id} produto={p} marcado={selecionados.includes(p.id)} copias={copias[p.id] ?? 1}
          aoMarcar={(marcado) => setSelecionados((atual) => marcado ? [...new Set([...atual, p.id])] : atual.filter((id) => id !== p.id))}
          aoMudarCopias={(n) => setCopias((atual) => ({ ...atual, [p.id]: n }))} />)}
      </Card>
    </div>
    <div className="etiquetas-print hidden print:block">{etiquetas.map(({ p, key }) => <Etiqueta key={key} produto={p} />)}</div>
  </div>;
}

function LinhaProduto({ produto: p, marcado, copias, aoMarcar, aoMudarCopias }: { produto: Produto; marcado: boolean; copias: number; aoMarcar: (v: boolean) => void; aoMudarCopias: (v: number) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 p-3 text-sm">
    <input type="checkbox" checked={marcado} onChange={(e) => aoMarcar(e.target.checked)} />
    <span className="min-w-0 flex-1"><b className="block truncate">{p.nome}</b><small className="text-muted">{p.codigoBarras} · {formatBRL(p.preco)}{p.unidade?.toLowerCase() === "kg" ? "/kg" : ""}</small></span>
    <span className="text-xs text-muted">Cópias</span><Input aria-label={`Cópias da etiqueta de ${p.nome}`} type="number" min={1} max={100} value={copias} onChange={(e) => aoMudarCopias(Number(e.target.value))} onClick={(e) => e.stopPropagation()} className="w-20" />
  </label>;
}

function Etiqueta({ produto: p }: { produto: Produto }) {
  return <div className="etiqueta flex flex-col items-center justify-between text-center font-sans">
    <div className="w-full truncate text-[9pt] font-bold">{p.nome}</div>
    <div className="w-full text-[9pt] font-semibold">{formatBRL(p.preco)}{p.unidade?.toLowerCase() === "kg" ? " / kg" : ""}</div>
    <CodigoBarras valor={p.codigoBarras ?? ""} className="h-[11mm] w-full" />
    <div className="text-[8pt] tracking-widest">{p.codigoBarras}</div>
  </div>;
}
