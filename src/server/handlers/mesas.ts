import "server-only";
import { normalizarCelular } from "@/lib/celular";
import { ServiceError } from "@/services/_base";
import type { ComandaPublica } from "@/services/mesas.service";
import type { Comanda, ComandaDetalhada, Mesa } from "@/types";
import { pool, query, um } from "../db";
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

  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const numero =
      pedido ??
      (
        await um<{ n: number }>(
          `select n from generate_series(1, 9999) n
           where not exists (select 1 from comandas where numero = n and status in ${ATIVAS})
           order by n limit 1`,
        )
      )?.n;
    if (!numero) throw new ServiceError("Sem números de comanda livres", "CONFLITO");
    try {
      const r = await um<{ id: string }>(
        `insert into comandas (mesa_id, numero, token, aberta_por, cliente_nome, cliente_celular)
         values ($1, $2, encode(gen_random_bytes(12), 'hex'), $3, $4, $5) returning id`,
        [mesaId, numero, sessao.uid, nome, celular],
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
