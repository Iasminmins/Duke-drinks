import "server-only";
import { randomBytes } from "node:crypto";
import { ServiceError } from "@/services/_base";
import type { DocumentoFiscal, FormaPagamento, Produto, VendaBalcao } from "@/types";
import { round2 } from "@/lib/utils";
import { hashOperacao, quantidadeVendaValida, saldoPermiteVenda } from "@/lib/operacao-segura";
import { query, tx, um, type Q } from "../db";
import { exigir, exigirTenant, type Ctx } from "../comum";

type Modulos = { balcao: boolean; estoque: boolean; nfce: boolean };
type MotivoMovimento = "saldo_inicial" | "compra" | "devolucao" | "venda_balcao" | "perda" | "vencimento" | "consumo_interno" | "quebra" | "contagem" | "outro";
const PRODUTO_BARRA_SQL = `select id, nome, preco, codigo_barras as "codigoBarras", controla_estoque as "controlaEstoque",
  estoque, estoque_minimo as "estoqueMinimo", unidade, esgotado from produtos`;
const DOC_SQL = `select id, venda_id as "vendaId", status, numero, serie, chave_acesso as "chaveAcesso",
  protocolo, url_danfe as "urlDanfe", url_xml as "urlXml", url_qrcode as "urlQrcode", url_consulta_nf as "urlConsulta", mensagem from documentos_fiscais`;

async function modulos() {
  const r = await um<{ modulos: Modulos }>(`select modulos from estabelecimento limit 1`);
  return r?.modulos ?? { balcao: false, estoque: false, nfce: false };
}

export async function buscarProdutoBalcao(ctx: Ctx, codigo: string) {
  exigir(ctx, "caixa");
  if (!(await modulos()).balcao) throw new ServiceError("Ative o módulo de balcão nas configurações", "PROIBIDO");
  const barra = String(codigo ?? "").trim().toUpperCase().replace(/\s/g, "");
  if (!barra) return null;
  return (await um<Produto>(`${PRODUTO_BARRA_SQL} where ativo and codigo_barras=$1`, [barra])) ?? null;
}

export async function listarProdutosBalcao(ctx: Ctx) {
  exigir(ctx, "caixa");
  if (!(await modulos()).balcao) throw new ServiceError("Ative o módulo de balcão nas configurações", "PROIBIDO");
  return query<Produto>(`${PRODUTO_BARRA_SQL} where ativo order by nome`);
}

export async function listarEstoque(ctx: Ctx) {
  exigir(ctx, "admin", "caixa");
  if (!(await modulos()).estoque) throw new ServiceError("Ative o módulo de estoque nas configurações", "PROIBIDO");
  return query<Produto>(`${PRODUTO_BARRA_SQL} where ativo order by nome`);
}

export async function listarMovimentosEstoque(ctx: Ctx) {
  exigir(ctx, "admin");
  if (!(await modulos()).estoque) throw new ServiceError("Ative o módulo de estoque nas configurações", "PROIBIDO");
  return query<{ id: string; criadoEm: string; produtoNome: string; tipo: string; motivo: MotivoMovimento; quantidade: number; observacao: string; usuarioNome: string }>(
    `select m.id, m.criado_em as "criadoEm", p.nome as "produtoNome", m.tipo, m.motivo, m.quantidade, m.observacao, u.nome as "usuarioNome"
      from movimentos_estoque m join produtos p on p.id=m.produto_id join usuarios u on u.id=m.usuario_id
      order by m.criado_em desc limit 100`);
}

export async function movimentarEstoque(ctx: Ctx, d: { produtoId: string; tipo: "entrada" | "saida" | "ajuste"; motivo: MotivoMovimento; quantidade: number; observacao?: string }) {
  const sessao = exigir(ctx, "admin");
  if (!(await modulos()).estoque) throw new ServiceError("Ative o módulo de estoque nas configurações", "PROIBIDO");
  const qtd = Number(d?.quantidade);
  const motivos: MotivoMovimento[] = ["saldo_inicial", "compra", "devolucao", "venda_balcao", "perda", "vencimento", "consumo_interno", "quebra", "contagem", "outro"];
  const motivosPorTipo: Record<string, MotivoMovimento[]> = {
    entrada: ["compra", "devolucao", "outro"],
    saida: ["perda", "vencimento", "consumo_interno", "quebra", "outro"],
    ajuste: ["contagem", "outro"],
  };
  if (!Number.isFinite(qtd) || qtd <= 0 || !["entrada", "saida", "ajuste"].includes(d?.tipo) || !motivos.includes(d?.motivo) || !motivosPorTipo[d.tipo]?.includes(d.motivo)) {
    throw new ServiceError("Informe um tipo, motivo e quantidade válidos para o movimento");
  }
  await tx(async (c) => {
    const p = await um<{ id: string; estoque: number; controlaEstoque: boolean }>(
      `select id, estoque, controla_estoque as "controlaEstoque" from produtos where id=$1 and ativo for update`, [String(d.produtoId)], c,
    );
    if (!p) throw new ServiceError("Produto não encontrado", "NAO_ENCONTRADO");
    const saldo = d.tipo === "entrada" ? p.estoque + qtd : d.tipo === "saida" ? p.estoque - qtd : qtd;
    if (saldo < 0) throw new ServiceError("A saída é maior que o saldo disponível");
    await c.query(`update produtos set estoque=$2, controla_estoque=true where id=$1`, [p.id, saldo]);
    await c.query(`insert into movimentos_estoque (produto_id, usuario_id, tipo, motivo, quantidade, observacao) values ($1,$2,$3,$4,$5,$6)`,
      [p.id, sessao.uid, d.tipo, d.motivo, qtd, String(d.observacao ?? "").trim().slice(0, 200)]);
  });
}

async function vendaPorChave(c: Q, chave: string, hash: string): Promise<VendaBalcao | null> {
  const registro = await um<{ id: string; requestHash: string | null }>(
    `select id, request_hash as "requestHash" from vendas_balcao where request_key=$1`, [chave], c,
  );
  if (!registro) return null;
  if (registro.requestHash !== hash) throw new ServiceError("Esta tentativa já foi registrada com outros itens. Confira as vendas recentes antes de abrir uma nova venda.", "CONFLITO");
  const venda = await um<VendaBalcao>(`select id, numero, status, criado_em as "criadoEm", subtotal, desconto, total from vendas_balcao where id=$1`, [registro.id], c);
  if (!venda) return null;
  const [itens, pagamento, fiscal] = await Promise.all([
    c.query(`select nome, codigo_barras as "codigoBarras", unidade, quantidade, preco_unitario as "precoUnitario", total from itens_venda_balcao where venda_id=$1 order by id`, [venda.id]),
    um<VendaBalcao["pagamento"]>(`select forma, valor, valor_recebido as "valorRecebido", troco from pagamentos_venda_balcao where venda_id=$1 limit 1`, [venda.id], c),
    um<DocumentoFiscal>(`${DOC_SQL} where venda_id=$1`, [venda.id], c),
  ]);
  return { ...venda, itens: itens.rows, pagamento: pagamento!, fiscal: fiscal ?? undefined };
}

export async function registrarVendaBalcao(ctx: Ctx, d: {
  itens: { produtoId: string; quantidade: number }[]; forma: FormaPagamento; valorRecebido?: number;
  desconto?: number; clienteNome?: string; clienteDocumento?: string; emitirNfce?: boolean; requestKey?: string;
}): Promise<VendaBalcao> {
  const sessao = exigir(ctx, "caixa");
  const m = await modulos();
  if (!m.balcao) throw new ServiceError("Ative o módulo de balcão nas configurações", "PROIBIDO");
  if (!Array.isArray(d?.itens) || d.itens.length < 1 || d.itens.length > 100) throw new ServiceError("Adicione produtos à venda");
  const formas: FormaPagamento[] = ["dinheiro", "pix", "debito", "credito", "outro"];
  if (!formas.includes(d.forma)) throw new ServiceError("Forma de pagamento inválida");
  if (d.emitirNfce && !m.nfce) throw new ServiceError("Ative a emissão de NFC-e nas configurações", "PROIBIDO");
  const requestKey = String(d.requestKey ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)) throw new ServiceError("Atualize a tela do caixa para iniciar uma venda segura.");

  const agregados = new Map<string, number>();
  for (const i of d.itens) {
    const informada = Number(i.quantidade);
    const qtd = Math.round(informada * 1000) / 1000;
    if (!i.produtoId || !quantidadeVendaValida(informada)) {
      throw new ServiceError("Quantidade inválida. Produtos por peso aceitam até três casas decimais em kg.");
    }
    agregados.set(i.produtoId, Math.round(((agregados.get(i.produtoId) ?? 0) + qtd) * 1000) / 1000);
  }
  const clienteDocumento = String(d.clienteDocumento ?? "").replace(/\D/g, "");
  if (clienteDocumento && ![11, 14].includes(clienteDocumento.length)) throw new ServiceError("CPF ou CNPJ do cliente inválido");
  const clienteNome = String(d.clienteNome ?? "").trim();
  if (clienteNome.length > 100) throw new ServiceError("O nome do consumidor deve ter no máximo 100 caracteres");
  const requestHash = hashOperacao({
    itens: [...agregados.entries()].sort(([a], [b]) => a.localeCompare(b)), forma: d.forma,
    valorRecebido: d.forma === "dinheiro" ? round2(Number(d.valorRecebido ?? 0)) : null,
    desconto: round2(Number(d.desconto ?? 0)), clienteNome, clienteDocumento,
    emitirNfce: !!d.emitirNfce,
  });
  return tx(async (c) => {
    const caixa = await um<{ id: string }>(`select id from caixas where fechado_em is null limit 1 for update`, [], c);
    if (!caixa) throw new ServiceError("Abra o caixa antes de registrar vendas", "PROIBIDO");
    const anterior = await vendaPorChave(c, requestKey, requestHash);
    if (anterior) return anterior;
    const produtos = await query<Produto>(`select p.id, p.nome, p.preco, p.codigo_barras as "codigoBarras",
      p.controla_estoque as "controlaEstoque", p.estoque, p.estoque_minimo as "estoqueMinimo", p.unidade,
      p.descricao, p.categoria_id as "categoriaId", p.setor_id as "setorId", p.imagem_url as "imagemUrl",
      p.esgotado, p.ativo, p.destaque, p.ncm, p.cest, p.cfop, p.origem_icms as "origemIcms",
      p.cst_icms as "cstIcms", p.cst_pis as "cstPis", p.cst_cofins as "cstCofins"
      from produtos p where p.id = any($1) and p.ativo order by p.id for update`, [[...agregados.keys()]], c);
    if (produtos.length !== agregados.size) throw new ServiceError("Um produto não está mais disponível");
    let subtotal = 0;
    const linhas = produtos.map((p) => {
      const quantidade = agregados.get(p.id)!;
      if (!saldoPermiteVenda(!!p.controlaEstoque, p.estoque ?? 0, quantidade)) throw new ServiceError(`Estoque insuficiente para ${p.nome}. Saldo: ${p.estoque ?? 0} ${p.unidade ?? "un"}.`);
      const total = round2(p.preco * quantidade);
      subtotal = round2(subtotal + total);
      return { p, quantidade, total };
    });
    const desconto = round2(Number(d.desconto ?? 0));
    if (!Number.isFinite(desconto) || desconto < 0 || desconto > subtotal) throw new ServiceError("Desconto inválido");
    const total = round2(subtotal - desconto);
    if (total <= 0) throw new ServiceError("O total precisa ser maior que zero");
    let recebido: number | null = null;
    let troco: number | null = null;
    if (d.forma === "dinheiro") {
      recebido = round2(Number(d.valorRecebido ?? total));
      if (recebido < total) throw new ServiceError("Valor recebido menor que o total da venda");
      troco = round2(recebido - total);
    }
    const venda = await um<{ id: string; numero: number; criadoEm: string }>(
      `insert into vendas_balcao (caixa_id, usuario_id, cliente_nome, cliente_documento, subtotal, desconto, total, request_key, request_hash)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (estabelecimento_id, request_key) where request_key is not null do nothing
       returning id, numero, criado_em as "criadoEm"`,
      [caixa.id, sessao.uid, clienteNome || null, clienteDocumento || null, subtotal, desconto, total, requestKey, requestHash], c,
    );
    if (!venda) {
      const repetida = await vendaPorChave(c, requestKey, requestHash);
      if (repetida) return repetida;
      throw new ServiceError("Não foi possível confirmar esta venda. Tente novamente.", "CONFLITO");
    }
    await c.query(`insert into pagamentos_venda_balcao (venda_id, caixa_id, forma, valor, valor_recebido, troco) values ($1,$2,$3,$4,$5,$6)`,
      [venda.id, caixa.id, d.forma, total, recebido, troco]);
    for (const { p, quantidade, total: linhaTotal } of linhas) {
      await c.query(`insert into itens_venda_balcao (venda_id, produto_id, codigo_barras, nome, unidade, quantidade, preco_unitario, total)
        values ($1,$2,$3,$4,$5,$6,$7,$8)`, [venda.id, p.id, p.codigoBarras ?? null, p.nome, p.unidade ?? "un", quantidade, p.preco, linhaTotal]);
      if (p.controlaEstoque) {
        await c.query(`update produtos set estoque=estoque-$2 where id=$1`, [p.id, quantidade]);
        await c.query(`insert into movimentos_estoque (produto_id, usuario_id, venda_id, tipo, motivo, quantidade, observacao)
          values ($1,$2,$3,'saida','venda_balcao',$4,'Venda de balcão')`, [p.id, sessao.uid, venda.id, quantidade]);
      }
    }
    if (d.emitirNfce) {
      const ref = `comandou_${exigirTenant(ctx).id}_${venda.id.replace(/-/g, "")}`;
      await c.query(`insert into documentos_fiscais (venda_id, provedor_ref) values ($1,$2)`, [venda.id, ref]);
    }
    const doc = d.emitirNfce ? await um<DocumentoFiscal>(`${DOC_SQL} where venda_id=$1`, [venda.id], c) : undefined;
    return {
      ...venda, status: "concluida", subtotal, desconto, total,
      itens: linhas.map(({ p, quantidade, total: linhaTotal }) => ({ nome: p.nome, codigoBarras: p.codigoBarras ?? undefined,
        unidade: p.unidade ?? "un", quantidade, precoUnitario: p.preco, total: linhaTotal })),
      pagamento: { forma: d.forma, valor: total, valorRecebido: recebido ?? undefined, troco: troco ?? undefined },
      fiscal: doc,
    } as VendaBalcao;
  });
}

export async function listarVendasBalcao(ctx: Ctx): Promise<VendaBalcao[]> {
  exigir(ctx, "admin", "caixa");
  if (!(await modulos()).balcao) throw new ServiceError("Ative o módulo de balcão nas configurações", "PROIBIDO");
  const vendas = await query<VendaBalcao>(`select id, numero, status, criado_em as "criadoEm", subtotal, desconto, total
    from vendas_balcao order by criado_em desc limit 100`);
  if (!vendas.length) return [];
  const ids = vendas.map((v) => v.id);
  const [itens, pagamentos, docs] = await Promise.all([
    query<{ vendaId: string; nome: string; codigoBarras: string | null; unidade: string; quantidade: number; precoUnitario: number; total: number }>(
      `select venda_id as "vendaId", nome, codigo_barras as "codigoBarras", unidade, quantidade, preco_unitario as "precoUnitario", total from itens_venda_balcao where venda_id=any($1)`, [ids]),
    query<{ vendaId: string; forma: FormaPagamento; valor: number; valorRecebido: number | null; troco: number | null }>(
      `select venda_id as "vendaId", forma, valor, valor_recebido as "valorRecebido", troco from pagamentos_venda_balcao where venda_id=any($1)`, [ids]),
    query<DocumentoFiscal>(`${DOC_SQL} where venda_id=any($1)`, [ids]),
  ]);
  return vendas.map((v) => ({ ...v, itens: itens.filter((i) => i.vendaId === v.id).map(({ vendaId: _id, codigoBarras, ...i }) => { void _id; return { ...i, codigoBarras: codigoBarras ?? undefined }; }),
    pagamento: (({ vendaId: _id, valorRecebido, troco, ...p }) => { void _id; return { ...p, valorRecebido: valorRecebido ?? undefined, troco: troco ?? undefined }; })(pagamentos.find((p) => p.vendaId === v.id)!),
    fiscal: docs.find((d) => d.vendaId === v.id),
  }));
}

interface FocusResposta {
  status?: string; status_sefaz?: string; mensagem_sefaz?: string; chave_nfe?: string; numero?: string; serie?: string;
  numero_protocolo?: string; caminho_danfe?: string; caminho_xml_nota_fiscal?: string; qrcode_url?: string; url_consulta_nf?: string;
}

function baseFocus(ambiente: string) {
  return ambiente === "producao" ? "https://api.focusnfe.com.br/v2" : "https://homologacao.focusnfe.com.br/v2";
}

async function focus(ref: string, ambiente: string, init?: RequestInit): Promise<FocusResposta> {
  const token = process.env.FOCUS_NFE_TOKEN;
  if (!token) throw new ServiceError("Configure FOCUS_NFE_TOKEN no servidor para conectar à Focus NFe", "PROIBIDO");
  const response = await fetch(`${baseFocus(ambiente)}/nfce/${encodeURIComponent(ref)}`, {
    ...init,
    headers: { authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`, accept: "application/json", "content-type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  let data: FocusResposta = {};
  try { data = await response.json(); } catch { /* resposta sem JSON */ }
  if (!response.ok) throw Object.assign(new Error(data.mensagem_sefaz || `Focus NFe respondeu HTTP ${response.status}`), { status: response.status });
  return data;
}

export async function emitirNfce(ctx: Ctx, vendaId: string): Promise<DocumentoFiscal> {
  exigir(ctx, "caixa");
  const m = await modulos();
  if (!m.nfce) throw new ServiceError("Ative a emissão de NFC-e nas configurações", "PROIBIDO");
  const est = await um<{ fiscalCnpj: string; fiscalIe: string; fiscalUf: string; fiscalCodigoMunicipio: string; fiscalRegime: string; fiscalAmbiente: string }>(
    `select fiscal_cnpj as "fiscalCnpj", fiscal_ie as "fiscalIe", fiscal_uf as "fiscalUf", fiscal_codigo_municipio as "fiscalCodigoMunicipio", fiscal_regime as "fiscalRegime", fiscal_ambiente as "fiscalAmbiente" from estabelecimento limit 1`);
  if (!est?.fiscalCnpj || !est.fiscalIe || !est.fiscalUf || !est.fiscalCodigoMunicipio || !est.fiscalRegime) throw new ServiceError("Complete CNPJ, inscrição estadual, UF, código IBGE do município e regime tributário em Configurações antes de emitir");
  const doc = await um<DocumentoFiscal & { provedorRef: string }>(`select id, venda_id as "vendaId", status, numero, serie,
    chave_acesso as "chaveAcesso", protocolo, url_danfe as "urlDanfe", url_xml as "urlXml", url_qrcode as "urlQrcode", url_consulta_nf as "urlConsulta", mensagem,
    provedor_ref as "provedorRef" from documentos_fiscais where venda_id=$1`, [vendaId]);
  if (!doc) throw new ServiceError("Venda sem emissão fiscal solicitada", "NAO_ENCONTRADO");
  if (doc.status === "autorizado") return doc;
  const itens = await query<{ nome: string; codigoBarras: string | null; quantidade: number; precoUnitario: number; total: number; unidade: string; ncm: string; cest: string; cfop: string; origemIcms: string; cstIcms: string; cstPis: string; cstCofins: string }>(
    `select i.nome, i.codigo_barras as "codigoBarras", i.quantidade, i.preco_unitario as "precoUnitario", i.total, i.unidade,
      p.ncm, p.cest, p.cfop, p.origem_icms as "origemIcms", p.cst_icms as "cstIcms", p.cst_pis as "cstPis", p.cst_cofins as "cstCofins"
      from itens_venda_balcao i join produtos p on p.id=i.produto_id where i.venda_id=$1`, [vendaId]);
  if (itens.some((i) => !i.ncm || !i.cfop || !i.origemIcms || !i.cstIcms || !i.cstPis || !i.cstCofins)) {
    throw new ServiceError("Preencha NCM, CFOP, origem e CST/CSOSN ICMS, CST PIS e CST COFINS de todos os itens com o contador");
  }
  const venda = await um<{ total: number; subtotal: number; desconto: number; clienteNome: string | null; clienteDocumento: string | null }>(
    `select total, subtotal, desconto, cliente_nome as "clienteNome", cliente_documento as "clienteDocumento" from vendas_balcao where id=$1`, [vendaId]);
  const pagamento = await um<{ forma: string; valor: number }>(`select forma, valor from pagamentos_venda_balcao where venda_id=$1 limit 1`, [vendaId]);
  if (!venda || !pagamento) throw new ServiceError("Venda ou pagamento não encontrado", "NAO_ENCONTRADO");
  const ambiente = est.fiscalAmbiente || "homologacao";
  let resposta: FocusResposta;
  try {
    // Em caso de repetição após timeout, consulta pela mesma referência antes de reenviar.
    try { resposta = await focus(doc.provedorRef, ambiente); }
    catch (e) {
      if ((e as { status?: number }).status !== 404) throw e;
      const body = {
        cnpj_emitente: est.fiscalCnpj, data_emissao: new Date().toISOString(),
        indicador_inscricao_estadual_destinatario: "9",
        ...(venda.clienteNome ? { nome_destinatario: venda.clienteNome } : {}),
        ...(venda.clienteDocumento?.length === 11 ? { cpf_destinatario: venda.clienteDocumento } : {}),
        ...(venda.clienteDocumento?.length === 14 ? { cnpj_destinatario: venda.clienteDocumento } : {}),
        modalidade_frete: "9", local_destino: "1", presenca_comprador: "1", natureza_operacao: "VENDA AO CONSUMIDOR",
        valor_produtos: venda.subtotal.toFixed(2), valor_desconto: venda.desconto.toFixed(2), valor_total: venda.total.toFixed(2),
        items: itens.map((i, index) => ({ numero_item: String(index + 1), codigo_produto: i.codigoBarras || `${vendaId}-${index + 1}`,
          codigo_barras_comercial: i.codigoBarras && /^\d{8,14}$/.test(i.codigoBarras) ? i.codigoBarras : "SEM GTIN",
          descricao: i.nome, codigo_ncm: i.ncm, ...(i.cest ? { cest: i.cest } : {}), cfop: i.cfop,
          unidade_comercial: i.unidade, quantidade_comercial: i.quantidade.toFixed(3), valor_unitario_comercial: i.precoUnitario.toFixed(2), valor_bruto: i.total.toFixed(2),
          icms_origem: i.origemIcms,
          ...(est.fiscalRegime === "1" || est.fiscalRegime === "2" ? { icms_csosn: i.cstIcms } : { icms_situacao_tributaria: i.cstIcms }),
          pis_situacao_tributaria: i.cstPis, cofins_situacao_tributaria: i.cstCofins })),
        formas_pagamento: [{ indicador_pagamento: "1", forma_pagamento: ({ dinheiro: "01", credito: "03", debito: "04", pix: "17", outro: "99" } as Record<string, string>)[pagamento.forma], valor_pagamento: pagamento.valor.toFixed(2) }],
      };
      const token = process.env.FOCUS_NFE_TOKEN;
      if (!token) throw new ServiceError("Configure FOCUS_NFE_TOKEN no servidor para conectar à Focus NFe", "PROIBIDO");
      const response = await fetch(`${baseFocus(ambiente)}/nfce?ref=${encodeURIComponent(doc.provedorRef)}`, {
        method: "POST", headers: { authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`, accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(20_000),
      });
      resposta = await response.json() as FocusResposta;
      if (!response.ok) throw new Error(resposta.mensagem_sefaz || `Focus NFe respondeu HTTP ${response.status}`);
    }
  } catch (e) {
    await query(`update documentos_fiscais set status='rejeitado', mensagem=$2, atualizado_em=now() where id=$1`, [doc.id, e instanceof Error ? e.message : "Falha de comunicação com o provedor fiscal"]);
    throw new ServiceError(e instanceof Error ? e.message : "Falha ao emitir NFC-e");
  }
  const status = resposta.status === "autorizado" ? "autorizado" : resposta.status === "erro_autorizacao" || resposta.status === "denegado" ? "rejeitado" : "pendente";
  return (await um<DocumentoFiscal>(`update documentos_fiscais set status=$2, numero=$3, serie=$4, chave_acesso=$5, protocolo=$6,
    url_danfe=$7, url_xml=$8, url_qrcode=$9, url_consulta_nf=$10, mensagem=$11, atualizado_em=now() where id=$1 returning id, venda_id as "vendaId", status, numero, serie,
    chave_acesso as "chaveAcesso", protocolo, url_danfe as "urlDanfe", url_xml as "urlXml", url_qrcode as "urlQrcode", url_consulta_nf as "urlConsulta", mensagem`,
    [doc.id, status, resposta.numero ?? null, resposta.serie ?? null, resposta.chave_nfe ?? null, resposta.numero_protocolo ?? null,
      resposta.caminho_danfe ?? null, resposta.caminho_xml_nota_fiscal ?? null, resposta.qrcode_url ?? null, resposta.url_consulta_nf ?? null,
      resposta.mensagem_sefaz ?? resposta.status_sefaz ?? resposta.status ?? ""] ))!;
}
