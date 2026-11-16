import "server-only";
import { normalizarCelular } from "@/lib/celular";
import { ServiceError } from "@/services/_base";
import type { Cartao, CartaoImpressao, ComandaPublica, EntradaCartao } from "@/services/mesas.service";
import type { Comanda, ComandaDetalhada, Mesa } from "@/types";
import { pool, query, tx, um } from "../db";
import { bloqueado, limpar, registrarFalha } from "../limite";
import { COMANDA_SQL, detalhar, erroAmigavel, exigir, type Ctx } from "../comum";

const MESA_SQL = `select id, numero, lugares, ativa from mesas`;
const ATIVAS = `('aberta','aguardando_pagamento')`;

/** comandas em andamento (com pedidos e totais) para o garçom e o caixa */
export async function listarComandasAtivas(ctx: Ctx): Promise<ComandaDetalhada[]> {
  exigir(ctx, "garcom", "caixa");
  const cms = await query<Comanda>(`${COMANDA_SQL} where c.status in ${ATIVAS} order by c.numero`);
  return detalhar(pool(), cms);
}

export async function listarMesas(ctx: Ctx): Promise<Mesa[]> {
  exigir(ctx, "admin", "garcom", "caixa");
  return query<Mesa>(`${MESA_SQL} order by numero`);
}

/** o cliente escaneou o QR: devolve a comanda dele (o token é o segredo) */
export async function entrarPorQr(ctx: Ctx, token: string): Promise<ComandaPublica> {
  const chave = `qr:${ctx.ip}`;
  if (bloqueado(chave, 15, 5 * 60_000)) {
    throw new ServiceError("Muitas tentativas. Tente de novo em alguns minutos.", "PROIBIDO");
  }
  const c = await um<ComandaPublica>(
    `select id, numero, status, cliente_nome as "clienteNome", cliente_celular as "clienteCelular"
     from comandas where token = $1`,
    [String(token ?? "").trim()],
  );
  if (!c) {
    registrarFalha(chave);
    throw new ServiceError("QR não reconhecido. Peça ajuda ao garçom.", "NAO_ENCONTRADO");
  }
  limpar(chave);
  return c;
}

/**
 * Abre uma comanda individual. Recebe o próximo número livre (ou o número do cartão, se informado)
 * e um token secreto para o QR. A mesa é opcional.
 */
export async function abrirComanda(
  ctx: Ctx,
  dados: { nome: string; celular: string; mesaId?: string | null; numero?: number | null },
): Promise<Comanda> {
  const sessao = exigir(ctx, "garcom", "caixa");
  const nome = String(dados?.nome ?? "").trim();
  if (nome.length < 2) throw new ServiceError("Informe o nome do cliente");
  const celular = normalizarCelular(String(dados?.celular ?? ""));
  if (!celular) throw new ServiceError("Informe o celular com DDD, ex.: (24) 99999-8888");
  let mesaId: string | null = null;
  if (dados?.mesaId) {
    const mesa = await um<Mesa>(`${MESA_SQL} where id = $1 and ativa`, [dados.mesaId]);
    if (!mesa) throw new ServiceError("Mesa não encontrada", "NAO_ENCONTRADO");
    mesaId = mesa.id;
  }
  const pedido = dados?.numero == null ? null : Math.trunc(Number(dados.numero));
  if (pedido !== null && !(pedido >= 1 && pedido <= 9999)) throw new ServiceError("Número de comanda inválido (1 a 9999)");

  // com cartões cadastrados, a comanda usa um dos cartões; sem cartões, numeração automática
  const usaCartoes = ((await um<{ n: number }>(`select count(*)::int as n from cartoes where ativo`))?.n ?? 0) > 0;
  if (usaCartoes && pedido !== null) {
    const k = await um(`select 1 from cartoes where ativo and numero = $1`, [pedido]);
    if (!k) throw new ServiceError(`A comanda ${pedido} não está cadastrada. Escolha um dos cartões.`, "NAO_ENCONTRADO");
  }

  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const numero =
      pedido ??
      (
        await um<{ n: number }>(
          usaCartoes
            ? `select k.numero as n from cartoes k
               where k.ativo and not exists (select 1 from comandas where numero = k.numero and status in ${ATIVAS})
               order by k.numero limit 1`
            : `select n from generate_series(1, 9999) n
               where not exists (select 1 from comandas where numero = n and status in ${ATIVAS})
               order by n limit 1`,
        )
      )?.n;
    if (!numero) {
      throw new ServiceError(
        usaCartoes ? "Todas as comandas estão em uso. Cadastre mais cartões no admin." : "Sem números de comanda livres",
        "CONFLITO",
      );
    }
    try {
      // savepoint: se o número já foi pego, desfaz só este insert e tenta o próximo
      const r = await tx((c) =>
        um<{ id: string }>(
          `insert into comandas (mesa_id, numero, token, aberta_por, cliente_nome, cliente_celular)
           values ($1, $2, encode(gen_random_bytes(12), 'hex'), $3, $4, $5) returning id`,
          [mesaId, numero, sessao.uid, nome, celular],
          c,
        ),
      );
      return (await um<Comanda>(`${COMANDA_SQL} where c.id = $1`, [r!.id]))!;
    } catch (e) {
      if ((e as { code?: string })?.code !== "23505") throw e;
      if (pedido !== null) throw new ServiceError(`A comanda ${pedido} já está em uso`, "CONFLITO");
      // outro garçom pegou o mesmo número agora: tenta o próximo livre
    }
  }
  throw new ServiceError("Não foi possível abrir a comanda. Tente novamente.", "CONFLITO");
}

// ------------------------------------------------------------------ cartões de comanda (números físicos)

/** cartões cadastrados, com quem está usando cada um agora */
export async function listarCartoes(ctx: Ctx): Promise<Cartao[]> {
  exigir(ctx, "admin", "garcom", "caixa");
  return query<Cartao>(
    `select k.numero, (c.id is not null) as "emUso", c.cliente_nome as "clienteNome"
       from cartoes k
       left join comandas c on c.numero = k.numero and c.status in ${ATIVAS}
      where k.ativo
      order by k.numero`,
  );
}

/** números e QRs fixos dos cartões, para imprimir (só o admin) */
export async function listarCartoesImpressao(ctx: Ctx): Promise<CartaoImpressao[]> {
  exigir(ctx, "admin");
  return query<CartaoImpressao>(`select numero, token from cartoes where ativo order by numero`);
}

/**
 * O cliente escaneou o QR fixo de um cartão.
 *  - cartão sem comanda aberta: "livre" (o garçom precisa abrir)
 *  - com comanda aberta: pede os 4 últimos dígitos do celular anotado pelo garçom; conferindo,
 *    devolve o token da comanda (o mesmo do QR da comanda) e o cliente segue para o cardápio.
 * Isso impede que alguém com uma foto antiga do cartão peça na conta de quem está com ele agora.
 */
export async function entrarPorCartao(ctx: Ctx, tokenBruto: unknown, ultimosBruto?: unknown): Promise<EntradaCartao> {
  const chave = `cartao:${ctx.ip}`;
  if (bloqueado(chave, 15, 5 * 60_000)) {
    throw new ServiceError("Muitas tentativas. Tente de novo em alguns minutos ou chame o garçom.", "PROIBIDO");
  }
  const k = await um<{ numero: number }>(`select numero from cartoes where ativo and token = $1`, [String(tokenBruto ?? "").trim()]);
  if (!k) {
    registrarFalha(chave);
    throw new ServiceError("Este cartão não está mais ativo. Chame o garçom.", "NAO_ENCONTRADO");
  }
  const c = await um<{ token: string; celular: string | null }>(
    `select token, cliente_celular as celular from comandas
      where numero = $1 and status in ${ATIVAS} order by aberta_em desc limit 1`,
    [k.numero],
  );
  if (!c) return { numero: k.numero, situacao: "livre" };
  const ultimos = String(ultimosBruto ?? "").replace(/\D/g, "");
  if (!ultimos) return { numero: k.numero, situacao: "confirmar" };
  if (ultimos.length !== 4 || !c.celular || c.celular.slice(-4) !== ultimos) {
    registrarFalha(chave);
    throw new ServiceError("Os números não conferem. Confira com o garçom o celular anotado na comanda.", "PROIBIDO");
  }
  return { numero: k.numero, situacao: "liberada", token: c.token };
}

/** cadastra uma faixa de números (ex.: 1 a 100). Números que já existem continuam iguais. */
export async function adicionarCartoes(ctx: Ctx, deBruto: unknown, ateBruto: unknown): Promise<{ adicionados: number }> {
  exigir(ctx, "admin");
  const de = Math.trunc(Number(deBruto));
  const ate = Math.trunc(Number(ateBruto));
  if (!(de >= 1 && ate <= 9999 && de <= ate)) throw new ServiceError("Informe uma faixa válida, ex.: de 1 até 100");
  if (ate - de + 1 > 500) throw new ServiceError("Cadastre no máximo 500 de uma vez");
  const r = await query<{ numero: number }>(
    `insert into cartoes (numero)
     select generate_series($1::int, $2::int)
     on conflict (estabelecimento_id, numero) do update set ativo = true where cartoes.ativo = false
     returning numero`,
    [de, ate],
  );
  return { adicionados: r.length };
}

export async function removerCartao(ctx: Ctx, numeroBruto: unknown): Promise<void> {
  exigir(ctx, "admin");
  const numero = Math.trunc(Number(numeroBruto));
  const emUso = await um(`select 1 from comandas where numero = $1 and status in ${ATIVAS}`, [numero]);
  if (emUso) throw new ServiceError(`A comanda ${numero} está em uso agora. Feche a conta antes de remover.`, "CONFLITO");
  await query(`update cartoes set ativo = false where numero = $1`, [numero]);
}

export async function salvarMesa(ctx: Ctx, dados: Mesa): Promise<Mesa> {
  exigir(ctx, "admin");
  const numero = Math.trunc(Number(dados?.numero));
  const lugares = Math.trunc(Number(dados?.lugares));
  if (!(numero > 0)) throw new ServiceError("Número da mesa inválido");
  if (!(lugares > 0)) throw new ServiceError("Número de lugares inválido");
  try {
    if (dados.id) {
      const r = await um<Mesa>(
        `update mesas set numero=$2, lugares=$3, ativa=$4 where id=$1 returning id, numero, lugares, ativa`,
        [dados.id, numero, lugares, dados.ativa !== false],
      );
      if (!r) throw new ServiceError("Mesa não encontrada", "NAO_ENCONTRADO");
      return r;
    }
    return (await um<Mesa>(
      `insert into mesas (numero, lugares, ativa) values ($1,$2,$3) returning id, numero, lugares, ativa`,
      [numero, lugares, dados.ativa !== false],
    ))!;
  } catch (e) {
    return erroAmigavel(e, { "23505": `Já existe a mesa ${numero}` });
  }
}

export async function excluirMesa(ctx: Ctx, id: string): Promise<void> {
  exigir(ctx, "admin");
  const r = await um<{ n: number }>(
    `select count(*)::int as n from comandas where mesa_id = $1 and status in ${ATIVAS}`,
    [id],
  );
  if (r && r.n > 0) throw new ServiceError("A mesa tem comanda aberta", "CONFLITO");
  await query(`update mesas set ativa = false where id = $1`, [id]);
}
