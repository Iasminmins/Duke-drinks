"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Barcode, Minus, Plus, Printer, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { getEstabelecimento, getEstadoFiscal } from "@/services/config.service";
import { emitirNfce, listarProdutosBalcao, listarVendasBalcao, registrarVendaBalcao, type ProdutoEstoque } from "@/services/balcao.service";
import { FORMA_LABEL, FORMAS } from "@/lib/labels";
import { formatBRL } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { round2 } from "@/lib/utils";
import type { FormaPagamento, VendaBalcao } from "@/types";
import { ComprovanteVenda } from "@/components/caixa/comprovante-venda";

type Linha = { produto: ProdutoEstoque; quantidade: number; entradaPeso?: string };
const peso = (q: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(q);
const quantidadeDigitada = (v: string) => {
  const normalizado = v.replace(",", ".");
  if (!/^\d*(?:\.\d{0,3})?$/.test(normalizado)) return null;
  if (!normalizado || normalizado === ".") return 0;
  const n = Number(normalizado);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
};
const passo = (p: ProdutoEstoque) => p.unidade?.toLowerCase() === "kg" ? 0.1 : 1;
const qtdFormatada = (q: number, unidade: string) => unidade.toLowerCase() === "kg" ? peso(q) : String(q);

export default function BalcaoPage() {
  const qc = useQueryClient();
  const campo = useRef<HTMLInputElement>(null);
  const estQ = useQuery({ queryKey: ["estabelecimento"], queryFn: getEstabelecimento });
  const fiscalQ = useQuery({ queryKey: ["estado-fiscal"], queryFn: getEstadoFiscal, enabled: !!estQ.data?.modulos?.nfce });
  const produtosQ = useQuery({ queryKey: ["produtos-balcao"], queryFn: listarProdutosBalcao });
  const vendasQ = useQuery({ queryKey: ["vendas-balcao"], queryFn: listarVendasBalcao });
  const [termo, setTermo] = useState("");
  const [carrinho, setCarrinho] = useState<Linha[]>([]);
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [recebido, setRecebido] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [emitirFiscal, setEmitirFiscal] = useState(false);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [errosPeso, setErrosPeso] = useState<Record<string, string>>({});
  const chaveVenda = useRef<string | null>(null);
  const [vendaParaImprimir, setVendaParaImprimir] = useState<VendaBalcao | null>(null);
  const totalBruto = round2(carrinho.reduce((s, l) => s + l.produto.preco * l.quantidade, 0));
  const total = round2(totalBruto - Math.min(Math.max(desconto, 0), totalBruto));
  const temPesoPendente = carrinho.some((l) => l.produto.unidade?.toLowerCase() === "kg" && l.quantidade <= 0);
  const sugestoes = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return (produtosQ.data ?? []).filter((p) => !t || p.nome.toLowerCase().includes(t) || (p.codigoBarras ?? "").includes(t)).slice(0, 8);
  }, [produtosQ.data, termo]);

  useEffect(() => {
    if (!vendaParaImprimir) return;
    const timer = window.setTimeout(() => window.print(), 150);
    const limpar = () => { setVendaParaImprimir(null); window.setTimeout(() => campo.current?.focus(), 100); };
    window.addEventListener("afterprint", limpar, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", limpar);
    };
  }, [vendaParaImprimir]);

  function adicionar(p: ProdutoEstoque) {
    if (p.esgotado) {
      toast.error(`${p.nome} está indisponível para venda.`);
      setTermo("");
      campo.current?.focus();
      return;
    }
    const porPeso = p.unidade?.toLowerCase() === "kg";
    setCarrinho((rows) => {
      const atual = rows.find((x) => x.produto.id === p.id);
      const prox = (atual?.quantidade ?? 0) + (porPeso ? 0 : 1);
      if (p.controlaEstoque && prox > (p.estoque ?? 0)) {
        toast.error(`Estoque insuficiente. Saldo de ${p.nome}: ${p.estoque} ${p.unidade ?? "un"}.`);
        return rows;
      }
      if (atual) return rows;
      return [...rows, { produto: p, quantidade: porPeso ? 0 : 1, entradaPeso: porPeso ? "" : undefined }];
    });
    setTermo("");
    campo.current?.focus();
  }

  function alterar(id: string, quantidade: number) {
    const p = carrinho.find((x) => x.produto.id === id)?.produto;
    if (!p) return;
    if (quantidade <= 0 && p.unidade?.toLowerCase() !== "kg") return setCarrinho((rows) => rows.filter((x) => x.produto.id !== id));
    if (quantidade < 0) return;
    if (p.controlaEstoque && quantidade > (p.estoque ?? 0)) return toast.error(`Saldo disponível: ${p.estoque} ${p.unidade ?? "un"}.`);
    setCarrinho((rows) => rows.map((x) => x.produto.id === id ? { ...x, quantidade, entradaPeso: x.produto.unidade?.toLowerCase() === "kg" ? (quantidade ? peso(quantidade) : "") : undefined } : x));
  }

  function alterarPeso(id: string, entrada: string) {
    const q = quantidadeDigitada(entrada);
    if (q === null) {
      setErrosPeso((x) => ({ ...x, [id]: "Informe um peso válido com até três casas decimais." }));
      return;
    }
    setErrosPeso((x) => ({ ...x, [id]: "" }));
    const linha = carrinho.find((x) => x.produto.id === id);
    if (!linha) return;
    if (linha.produto.controlaEstoque && q > (linha.produto.estoque ?? 0)) return toast.error(`Saldo disponível: ${linha.produto.estoque} kg.`);
    setCarrinho((rows) => rows.map((x) => x.produto.id === id ? { ...x, quantidade: q, entradaPeso: entrada } : x));
  }

  const vender = useMutation({
    mutationFn: async () => {
      if (!chaveVenda.current) {
        const storageKey = `comandou:tentativa-venda:${window.location.hostname}`;
        try {
          const salvo = localStorage.getItem(storageKey);
          const id = salvo ? JSON.parse(salvo)?.requestKey : null;
          chaveVenda.current = typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : crypto.randomUUID();
          localStorage.setItem(storageKey, JSON.stringify({ requestKey: chaveVenda.current }));
        } catch { chaveVenda.current = crypto.randomUUID(); }
      }
      const venda = await registrarVendaBalcao({ itens: carrinho.map((l) => ({ produtoId: l.produto.id, quantidade: l.quantidade })), forma,
        valorRecebido: forma === "dinheiro" ? recebido : undefined, desconto, emitirNfce: emitirFiscal, clienteNome, clienteDocumento, requestKey: chaveVenda.current });
      let fiscalError: string | null = null;
      if (venda.fiscal) {
        try { venda.fiscal = await emitirNfce(venda.id); }
        catch (e) { fiscalError = mensagemErro(e); }
      }
      return { venda, fiscalError };
    },
    onSuccess: ({ venda, fiscalError }) => {
      setVendaParaImprimir(venda);
      setCarrinho([]); setDesconto(0); setRecebido(0); setEmitirFiscal(false); setClienteNome(""); setClienteDocumento("");
      try { localStorage.removeItem(`comandou:tentativa-venda:${window.location.hostname}`); } catch { /* armazenamento opcional */ }
      chaveVenda.current = null;
      void qc.invalidateQueries({ queryKey: ["produtos-balcao"] });
      void qc.invalidateQueries({ queryKey: ["vendas-balcao"] });
      void qc.invalidateQueries({ queryKey: ["resumo-caixa"] });
      toast.success(`Venda #${venda.numero} registrada`);
      if (fiscalError) toast.error("Venda salva. NFC-e pendente: avise o administrador para conferir a configuração fiscal e tente novamente.");
      else if (venda.fiscal?.status === "autorizado") toast.success(`NFC-e ${venda.fiscal.numero ?? "autorizada"}`);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const retryFiscal = useMutation({
    mutationFn: emitirNfce,
    onSuccess: async () => { toast.success("NFC-e atualizada"); await qc.invalidateQueries({ queryKey: ["vendas-balcao"] }); },
    onError: () => toast.error("Não foi possível atualizar a NFC-e. A venda continua salva; confira a configuração com o administrador e tente novamente."),
  });

  if (estQ.data && !estQ.data.modulos?.balcao) return <div className="mx-auto max-w-xl pt-10"><EmptyState titulo="Balcão desativado" descricao="Um administrador pode ativar Caixa de balcão em Admin → Configurações → Recursos deste estabelecimento." /></div>;

  return <div>
      <PageHeader descricao="Bipe o código de barras ou pesquise o produto. O pagamento e a baixa de estoque são registrados juntos." acoes={<a href="/caixa/balcao" className="sr-only">Caixa de balcão</a>} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Card className="p-3">
          <div className="relative">
            <Barcode className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gold" />
            <Input ref={campo} autoFocus placeholder="Bipe ou pesquise um produto" aria-label="Bipar código de barras ou pesquisar produto" value={termo}
              onChange={(e) => setTermo(e.target.value)} onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const cod = termo.trim().toUpperCase().replace(/\s/g, "");
                const encontrado = (produtosQ.data ?? []).find((p) => cod && p.codigoBarras === cod);
                if (encontrado) adicionar(encontrado);
                else if (sugestoes.length === 1) adicionar(sugestoes[0]);
                else if (sugestoes.length > 1) toast.error("Mais de um produto encontrado. Selecione o item correto na lista.");
                else toast.error("Código ou produto não encontrado. Cadastre o código em Admin → Produtos.");
              }} className="pl-11" />
          </div>
          {termo && <div className="mt-2 divide-y divide-line rounded-lg border border-line bg-bg-soft">
            {sugestoes.map((p) => <button key={p.id} disabled={p.esgotado} onClick={() => adicionar(p)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60">
              <span className="min-w-0 flex-1"><b className="block truncate text-sm">{p.nome}{p.esgotado && " · Indisponível"}</b><small className="text-subtle">{p.codigoBarras || "Sem código"} · {p.estoque ?? 0} {p.unidade ?? "un"} em estoque</small></span><b>{formatBRL(p.preco)} / {p.unidade?.toLowerCase() === "kg" ? "kg" : p.unidade ?? "un"}</b>
            </button>)}
            {!sugestoes.length && <p className="p-3 text-sm text-muted">Nenhum produto encontrado.</p>}
          </div>}
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 font-semibold">Itens da venda <span className="text-sm font-normal text-muted">({carrinho.length})</span></div>
          {!carrinho.length ? <div className="p-8"><EmptyState compacto titulo="Carrinho vazio" descricao="Bipe o primeiro produto para começar." /></div> :
            <ul className="divide-y divide-line">{carrinho.map(({ produto: p, quantidade: q, entradaPeso }) => {
              const porPeso = p.unidade?.toLowerCase() === "kg";
              const unidade = p.unidade ?? "un";
              const incremento = passo(p);
              return <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><b className="block truncate">{p.nome}</b><span className="text-xs text-muted">{porPeso ? `${formatBRL(p.preco)} por kg` : `${formatBRL(p.preco)} / ${unidade}`}</span></div>
                <div className="flex items-center gap-1">
                  <Button size="icon-sm" variant="secondary" aria-label={`Diminuir ${porPeso ? "100 gramas de " : "uma unidade de "}${p.nome}`} onClick={() => alterar(p.id, Math.round((q - incremento) * 1000) / 1000)}><Minus className="h-4 w-4" /></Button>
                  <label className="sr-only" htmlFor={`qtd-${p.id}`}>{porPeso ? `Peso em kg de ${p.nome}` : `Quantidade de ${p.nome}`}</label>
                  <input id={`qtd-${p.id}`} aria-label={porPeso ? `Peso em kg de ${p.nome}` : `Quantidade de ${p.nome}`} aria-invalid={!!errosPeso[p.id]} inputMode={porPeso ? "decimal" : "numeric"} type="text"
                    placeholder={porPeso ? "0,000" : "1"} value={porPeso ? (entradaPeso ?? (q ? peso(q) : "")) : q}
                    onChange={(e) => {
                      if (porPeso) alterarPeso(p.id, e.target.value);
                      else {
                        const v = e.target.value === "" ? 0 : Number(e.target.value);
                        if (Number.isFinite(v)) alterar(p.id, v);
                      }
                    }} className="h-9 w-24 rounded border border-line bg-bg px-2 text-center tabular-nums" />
                  <Button size="icon-sm" variant="secondary" aria-label={`Aumentar ${porPeso ? "100 gramas de " : "uma unidade de "}${p.nome}`} onClick={() => alterar(p.id, Math.round((q + incremento) * 1000) / 1000)}><Plus className="h-4 w-4" /></Button>
                  {porPeso && <span className="text-xs text-muted">kg</span>}
                </div>
                {errosPeso[p.id] && <p className="w-full text-right text-xs text-red" role="alert">{errosPeso[p.id]}</p>}
                <b className="w-24 text-right tabular-nums">{formatBRL(p.preco * q)}</b><Button size="icon-sm" variant="ghost" aria-label={`Remover ${p.nome}`} onClick={() => alterar(p.id, -1)}><Trash2 className="h-4 w-4" /></Button>
              </li>;
            })}</ul>}
        </Card>
      </div>
      <Card className="h-fit p-4">
        <div className="flex items-center gap-2 font-semibold"><ShoppingCart className="h-5 w-5 text-gold" /> Finalizar venda</div>
        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-sm text-muted"><span>Subtotal</span><span>{formatBRL(totalBruto)}</span></div>
          <Field label="Desconto (R$)" htmlFor="venda-desconto"><Input id="venda-desconto" type="number" min="0" max={totalBruto} step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} /></Field>
          <div className="flex justify-between border-t border-line pt-3 text-xl font-bold"><span>Total</span><span>{formatBRL(total)}</span></div>
          <Field label="Forma de pagamento" htmlFor="venda-forma"><Select id="venda-forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>{FORMAS.map((f) => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}</Select></Field>
          {forma === "dinheiro" && <Field label="Valor recebido" htmlFor="venda-recebido"><Input id="venda-recebido" type="number" min={total} step="0.01" value={recebido} onChange={(e) => setRecebido(Number(e.target.value))} /></Field>}
          {forma === "dinheiro" && recebido > total && <div className="flex justify-between rounded-lg bg-surface p-3 text-sm"><span>Troco</span><b>{formatBRL(recebido - total)}</b></div>}
          {estQ.data?.modulos?.nfce && <label className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm"><input type="checkbox" checked={emitirFiscal} onChange={(e) => setEmitirFiscal(e.target.checked)} /> Emitir NFC-e nesta venda</label>}
          {emitirFiscal && <div className="space-y-3 rounded-lg border border-line p-3"><p className="text-xs text-muted">Identificação do consumidor (opcional)</p><Input placeholder="Nome do consumidor" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} /><Input placeholder="CPF ou CNPJ" inputMode="numeric" value={clienteDocumento} onChange={(e) => setClienteDocumento(e.target.value.replace(/\D/g, "").slice(0, 14))} />
            {fiscalQ.isLoading ? <p className="text-xs text-muted">Verificando configuração fiscal…</p> : fiscalQ.data?.ausentes.length ? <p className="text-sm text-warn">Configuração fiscal pendente. Avise o administrador: falta {fiscalQ.data.ausentes.join(", ")}. A venda será salva e a NFC-e ficará pendente.</p> : <p className="text-xs text-muted">Ambiente: {fiscalQ.data?.ambiente === "producao" ? "Produção" : "Homologação"}. Se a Focus estiver indisponível, a venda fica salva e você pode tentar emitir depois.</p>}
          </div>}
          <Button block size="lg" disabled={!carrinho.length || total <= 0 || (forma === "dinheiro" && recebido < total)} loading={vender.isPending} onClick={() => vender.mutate()}>
            {vender.isError ? "Tentar novamente · mesma venda" : "Registrar venda"} · {formatBRL(total)}
          </Button>
          {vender.isError && <button className="w-full text-xs text-muted underline" onClick={() => {
            if (!window.confirm("Confira Vendas recentes antes de continuar. Só inicie outra venda se a tentativa anterior não estiver registrada. Deseja limpar a tentativa pendente?")) return;
            chaveVenda.current = null;
            try { localStorage.removeItem(`comandou:tentativa-venda:${window.location.hostname}`); } catch { /* armazenamento opcional */ }
            vender.reset();
          }}>Já conferi Vendas recentes · limpar tentativa pendente</button>}
          <p className="text-center text-xs text-subtle">A baixa do estoque e o lançamento no caixa são feitos junto com a venda.</p>
        </div>
      </Card>
    </div>
    <div className="mt-8"><h2 className="mb-3 font-display text-2xl">Vendas recentes</h2><Card className="divide-y divide-line">
      {(vendasQ.data ?? []).slice(0, 12).map((v: VendaBalcao) => <div key={v.id} className="flex flex-wrap items-center gap-3 p-3 text-sm"><b>#{v.numero}</b><span className="flex-1 text-muted">{new Date(v.criadoEm).toLocaleString("pt-BR")}</span><span>{v.itens.map((i) => `${i.quantidade} ${i.unidade} ${i.nome}`).join(", ")}</span><b>{formatBRL(v.total)}</b><Button size="sm" variant="secondary" onClick={() => setVendaParaImprimir(v)}><Printer className="h-4 w-4" /> Comprovante</Button>{v.fiscal && <span className={v.fiscal.status === "autorizado" ? "text-ok" : "text-warn"}>NFC-e: {v.fiscal.status}{v.fiscal.numero ? ` · ${v.fiscal.numero}` : ""}</span>}{v.fiscal?.status === "autorizado" && v.fiscal.urlQrcode && <a className="text-gold underline" href={v.fiscal.urlQrcode} target="_blank" rel="noreferrer">Ver QR da NFC-e</a>}{v.fiscal && v.fiscal.status !== "autorizado" && <Button size="sm" variant="secondary" loading={retryFiscal.isPending} onClick={() => retryFiscal.mutate(v.id)}>Tentar NFC-e</Button>}</div>)}
      {!vendasQ.data?.length && <p className="p-4 text-sm text-muted">As vendas deste caixa aparecem aqui.</p>}
    </Card></div>
    {vendaParaImprimir && <ComprovanteVenda venda={vendaParaImprimir} estabelecimento={estQ.data} />}
    <style jsx global>{`
      .comprovante-venda { display: none; }
      @page { size: 80mm auto; margin: 3mm; }
      @media print {
        html, body { width: 80mm !important; margin: 0 !important; background: #fff !important; color: #111 !important; }
        body * { visibility: hidden !important; }
        .comprovante-venda, .comprovante-venda * { visibility: visible !important; }
        .comprovante-venda { display: block !important; position: absolute !important; inset: 0 auto auto 0 !important; width: 74mm !important; padding: 0 !important; color: #111 !important; background: #fff !important; font: 10px/1.35 Arial, sans-serif !important; }
        .comprovante-cabecalho { text-align: center; border-bottom: 1px dashed #555; padding-bottom: 8px; }
        .comprovante-logo { display: block; width: 8mm; height: 8mm; margin: 0 auto 2mm; object-fit: contain; }
        .comprovante-cabecalho h1 { font-size: 15px; font-weight: 700; margin: 0 0 3px; }
        .comprovante-cabecalho p { margin: 0 0 7px; font-size: 9px; }
        .comprovante-cabecalho strong { font-size: 12px; letter-spacing: .04em; }
        .comprovante-meta { display: flex; justify-content: space-between; gap: 6px; padding: 7px 0; border-bottom: 1px dashed #777; }
        .comprovante-itens { padding: 7px 0; border-bottom: 1px dashed #777; }
        .comprovante-colunas, .comprovante-item { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; }
        .comprovante-colunas { font-size: 8px; font-weight: 700; margin-bottom: 5px; }
        .comprovante-item { margin: 0 0 6px; }
        .comprovante-item b { grid-column: 1 / -1; font-size: 10px; }
        .comprovante-item span, .comprovante-item strong { font-size: 9px; }
        .comprovante-totais, .comprovante-pagamento { padding: 7px 0; border-bottom: 1px dashed #777; }
        .comprovante-totais p, .comprovante-pagamento p { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
        .comprovante-totais .comprovante-total { font-size: 14px; border-top: 1px solid #333; padding-top: 5px; margin-top: 5px; }
        .comprovante-pagamento .comprovante-obrigado { display: block; text-align: center; margin-top: 10px; font-weight: 700; }
      }
    `}</style>
  </div>;
}
