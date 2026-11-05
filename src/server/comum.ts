import "server-only";
import { calcularTotais } from "@/lib/calc";
import { ServiceError } from "@/services/_base";
import type { Comanda, ComandaDetalhada, ItemPedido, Pagamento, Papel, Pedido, Usuario } from "@/types";
import { query, um, type Q } from "./db";

/** sem sessão válida (cookie ausente/expirado) -> HTTP 401 */
export class SemSessao extends Error {
  constructor(msg = "Sessão expirada. Entre novamente.") {
    super(msg);
    this.name = "SemSessao";
  }
}

export interface Ctx {
  /** usuário da equipe com sessão válida (já conferido no banco: existe e está ativo) */
  sessao: { uid: string; papel: Papel } | null;
  ip: string;
  iniciarSessao: (u: Usuario) => void;
  encerrarSessao: () => void;
}

/** exige equipe logada com um dos papéis (admin sempre pode) */
export function exigir(ctx: Ctx, ...papeis: Papel[]) {
  if (!ctx.sessao) throw new SemSessao();
  if (ctx.sessao.papel !== "admin" && !papeis.includes(ctx.sessao.papel)) {
    throw new ServiceError("Seu acesso não inclui esta ação", "PROIBIDO");
  }
  return ctx.sessao;
}

export function exigirEquipe(ctx: Ctx) {
  if (!ctx.sessao) throw new SemSessao();
  return ctx.sessao;
}

// ---------------------------------------------------------------- SQL de leitura
export const COMANDA_SQL = `
  select c.id, c.mesa_id as "mesaId", m.numero as "mesaNumero", c.codigo, c.status,
         c.aberta_em as "abertaEm", c.aberta_por as "abertaPor",
         c.fechada_em as "fechadaEm", c.fechada_por as "fechadaPor",
         c.cobrar_taxa_servico as "cobrarTaxaServico", c.desconto,
         c.chamando_garcom as "chamandoGarcom", c.chamado_em as "chamadoEm",
         c.cliente_nome as "clienteNome", c.cliente_celular as "clienteCelular"
  from comandas c join mesas m on m.id = c.mesa_id`;

export async function getTaxaServico(c: Q): Promise<number> {
  const r = await um<{ t: number }>(`select taxa_servico_padrao as t from estabelecimento limit 1`, [], c);
  return r?.t ?? 10;
}

export async function carregarPedidos(c: Q, comandaIds: string[]): Promise<Pedido[]> {
  if (!comandaIds.length) return [];
  const pedidos = await query<Omit<Pedido, "itens">>(
    `select p.id, p.numero, p.comanda_id as "comandaId", m.numero as "mesaNumero", p.origem,
            p.criado_em as "criadoEm", p.atualizado_em as "atualizadoEm"
     from pedidos p
     join comandas c on c.id = p.comanda_id join mesas m on m.id = c.mesa_id
     where p.comanda_id = any($1) order by p.criado_em, p.numero`,
    [comandaIds],
    c,
  );
  if (!pedidos.length) return [];
  const itens = await query<Omit<ItemPedido, "adicionais"> & { pedidoId: string }>(
    `select i.id, i.pedido_id as "pedidoId", i.produto_id as "produtoId", i.nome,
            i.preco_unitario as "precoUnitario", i.quantidade, i.observacao,
            i.setor_id as "setorId", i.status
     from itens_pedido i where i.pedido_id = any($1) order by i.seq`,
    [pedidos.map((p) => p.id)],
    c,
  );
  const adics = itens.length
    ? await query<{ itemId: string; adicionalId: string; nome: string; preco: number }>(
        `select item_id as "itemId", adicional_id as "adicionalId", nome, preco
         from item_adicionais where item_id = any($1) order by id`,
        [itens.map((i) => i.id)],
        c,
      )
    : [];
  return pedidos.map((p) => ({
    ...p,
    itens: itens
      .filter((i) => i.pedidoId === p.id)
      .map(({ pedidoId: _p, ...i }) => {
        void _p;
        return {
          ...i,
          adicionais: adics
            .filter((a) => a.itemId === i.id)
            .map((a) => ({ adicionalId: a.adicionalId, nome: a.nome, preco: a.preco })),
        };
      }),
  }));
}

export async function carregarPagamentos(c: Q, comandaIds: string[]): Promise<Pagamento[]> {
  if (!comandaIds.length) return [];
  return query<Pagamento>(
    `select id, comanda_id as "comandaId", caixa_id as "caixaId", forma, valor,
            valor_recebido as "valorRecebido", troco, usuario_id as "usuarioId",
            criado_em as "criadoEm", estornado, motivo_estorno as "motivoEstorno",
            estornado_por as "estornadoPor", estornado_em as "estornadoEm"
     from pagamentos where comanda_id = any($1) order by criado_em`,
    [comandaIds],
    c,
  );
}

/** comandas + pedidos + pagamentos + totais (mesma forma que o front espera) */
export async function detalhar(c: Q, comandas: Comanda[]): Promise<ComandaDetalhada[]> {
  if (!comandas.length) return [];
  const ids = comandas.map((x) => x.id);
  const [pedidos, pagamentos, taxa] = await Promise.all([
    carregarPedidos(c, ids),
    carregarPagamentos(c, ids),
    getTaxaServico(c),
  ]);
  return comandas.map((cm) => {
    const ps = pedidos.filter((p) => p.comandaId === cm.id);
    const pgs = pagamentos.filter((p) => p.comandaId === cm.id);
    return { ...cm, pedidos: ps, pagamentos: pgs, totais: calcularTotais(cm, ps, pgs, taxa) };
  });
}

export async function comandaPorId(c: Q, id: string): Promise<Comanda | undefined> {
  return um<Comanda>(`${COMANDA_SQL} where c.id = $1`, [id], c);
}

/**
 * Autoriza o acesso a uma comanda: equipe logada, OU o cliente com o código dela.
 * O código é o "segredo" do cliente; tentativas erradas são limitadas.
 */
export function codigoConfere(cm: Comanda, codigo?: string) {
  return !!codigo && cm.codigo === codigo.trim();
}

/** converte erros do Postgres em mensagens amigáveis */
export function erroAmigavel(e: unknown, mapa: Record<string, string>): never {
  const code = (e as { code?: string })?.code;
  if (code && mapa[code]) throw new ServiceError(mapa[code], "CONFLITO");
  throw e;
}
