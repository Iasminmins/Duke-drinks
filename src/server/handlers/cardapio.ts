import "server-only";
import { ServiceError } from "@/services/_base";
import type { Cardapio } from "@/services/cardapio.service";
import type { Adicional, Categoria, Produto, Setor } from "@/types";
import { pool, query, tx, um, type Q } from "../db";
import { erroAmigavel, exigir, type Ctx } from "../comum";

const PRODUTO_SQL = `
  select p.id, p.nome, p.descricao, p.preco, p.categoria_id as "categoriaId", p.setor_id as "setorId",
         p.imagem_url as "imagemUrl", p.esgotado, p.ativo, p.destaque,
         coalesce((select array_agg(pa.adicional_id order by pa.adicional_id)
                   from produto_adicionais pa where pa.produto_id = p.id), '{}') as "adicionaisIds"
  from produtos p`;
const CATEGORIA_SQL = `select id, nome, ordem, ativa from categorias`;
const ADICIONAL_SQL = `select id, nome, preco from adicionais order by seq`;
const SETOR_SQL = `select id, nome, slug from setores order by seq`;

/** cardápio público: só categorias e produtos ativos */
export async function getCardapio(): Promise<Cardapio> {
  const categorias = await query<Categoria>(`${CATEGORIA_SQL} where ativa order by ordem, nome`);
  const produtos = await query<Produto>(
    `${PRODUTO_SQL} where p.ativo and p.categoria_id in (select id from categorias where ativa) order by p.seq`,
  );
  const [adicionais, setores] = await Promise.all([query<Adicional>(ADICIONAL_SQL), query<Setor>(SETOR_SQL)]);
  return { categorias, produtos: ordenarProdutos(produtos, categorias), adicionais, setores };
}

export async function getCardapioAdmin(ctx: Ctx): Promise<Cardapio> {
  exigir(ctx, "admin");
  const categorias = await query<Categoria>(`${CATEGORIA_SQL} order by ordem, nome`);
  const produtos = await query<Produto>(`${PRODUTO_SQL} order by p.seq`);
  const [adicionais, setores] = await Promise.all([query<Adicional>(ADICIONAL_SQL), query<Setor>(SETOR_SQL)]);
  return { categorias, produtos: ordenarProdutos(produtos, categorias), adicionais, setores };
}

// por categoria (na ordem do cardápio) e, dentro dela, na ordem de cadastro (a query já vem por seq)
function ordenarProdutos(produtos: Produto[], categorias: Categoria[]) {
  const pos = new Map(categorias.map((c, i) => [c.id, i]));
  return [...produtos].sort((a, b) => (pos.get(a.categoriaId) ?? 99) - (pos.get(b.categoriaId) ?? 99));
}

async function produtoPorId(c: Q, id: string) {
  return um<Produto>(`${PRODUTO_SQL} where p.id = $1`, [id], c);
}

// ------------------------------------------------------------------ produtos
export async function salvarProduto(ctx: Ctx, dados: Produto): Promise<Produto> {
  exigir(ctx, "admin");
  const nome = String(dados?.nome ?? "").trim();
  const preco = Number(dados?.preco);
  if (nome.length < 2) throw new ServiceError("Informe o nome do produto");
  if (!Number.isFinite(preco) || preco < 0) throw new ServiceError("Preço inválido");
  const imagem = dados.imagemUrl ? String(dados.imagemUrl) : null;
  if (imagem && imagem.length > 2_000_000) throw new ServiceError("Imagem muito grande (máx. cerca de 1,5 MB)");
  const adicionais = Array.isArray(dados.adicionaisIds) ? dados.adicionaisIds.map(String) : [];

  try {
    return await tx(async (c) => {
      let id = dados.id;
      if (id) {
        const r = await um<{ id: string }>(
          `update produtos set nome=$2, descricao=$3, preco=$4, categoria_id=$5, setor_id=$6, imagem_url=$7,
                  esgotado=$8, ativo=$9, destaque=$10 where id=$1 returning id`,
          [id, nome, String(dados.descricao ?? ""), preco, dados.categoriaId, dados.setorId, imagem, !!dados.esgotado, dados.ativo !== false, !!dados.destaque],
          c,
        );
        if (!r) throw new ServiceError("Produto não encontrado", "NAO_ENCONTRADO");
      } else {
        const r = await um<{ id: string }>(
          `insert into produtos (nome, descricao, preco, categoria_id, setor_id, imagem_url, esgotado, ativo, destaque)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
          [nome, String(dados.descricao ?? ""), preco, dados.categoriaId, dados.setorId, imagem, !!dados.esgotado, dados.ativo !== false, !!dados.destaque],
          c,
        );
        id = r!.id;
      }
      await c.query(`delete from produto_adicionais where produto_id = $1`, [id]);
      if (adicionais.length) {
        await c.query(
          `insert into produto_adicionais (produto_id, adicional_id)
           select $1, a.id from adicionais a where a.id = any($2)`,
          [id, adicionais],
        );
      }
      return (await produtoPorId(c, id!))!;
    });
  } catch (e) {
    return erroAmigavel(e, { "23503": "Categoria ou setor inválido" });
  }
}

export async function alternarEsgotado(ctx: Ctx, id: string): Promise<Produto> {
  exigir(ctx, "garcom", "cozinha", "bar");
  const r = await um<{ id: string }>(`update produtos set esgotado = not esgotado where id = $1 returning id`, [id]);
  if (!r) throw new ServiceError("Produto não encontrado", "NAO_ENCONTRADO");
  return (await produtoPorId(pool(), id))!;
}

/** soft delete: o produto continua no histórico dos pedidos */
export async function excluirProduto(ctx: Ctx, id: string): Promise<void> {
  exigir(ctx, "admin");
  await query(`update produtos set ativo = false where id = $1`, [id]);
}

// ------------------------------------------------------------------ categorias
export async function salvarCategoria(ctx: Ctx, dados: Categoria): Promise<Categoria> {
  exigir(ctx, "admin");
  const nome = String(dados?.nome ?? "").trim();
  if (nome.length < 2) throw new ServiceError("Informe o nome da categoria");
  const ordem = Number.isFinite(Number(dados.ordem)) ? Math.trunc(Number(dados.ordem)) : 0;
  if (dados.id) {
    const r = await um<Categoria>(
      `update categorias set nome=$2, ordem=$3, ativa=$4 where id=$1 returning id, nome, ordem, ativa`,
      [dados.id, nome, ordem, dados.ativa !== false],
    );
    if (!r) throw new ServiceError("Categoria não encontrada", "NAO_ENCONTRADO");
    return r;
  }
  return (await um<Categoria>(
    `insert into categorias (nome, ordem, ativa) values ($1,$2,$3) returning id, nome, ordem, ativa`,
    [nome, ordem, dados.ativa !== false],
  ))!;
}

export async function excluirCategoria(ctx: Ctx, id: string): Promise<void> {
  exigir(ctx, "admin");
  const ativos = await um<{ n: number }>(`select count(*)::int as n from produtos where categoria_id=$1 and ativo`, [id]);
  if (ativos && ativos.n > 0) {
    throw new ServiceError("Mova ou desative os produtos desta categoria antes de excluir", "CONFLITO");
  }
  try {
    await query(`delete from categorias where id = $1`, [id]);
  } catch (e) {
    // ainda há produtos desativados (histórico) apontando para ela: apenas desativa
    if ((e as { code?: string })?.code === "23503") await query(`update categorias set ativa = false where id = $1`, [id]);
    else throw e;
  }
}

// ------------------------------------------------------------------ adicionais
export async function salvarAdicional(ctx: Ctx, dados: Adicional): Promise<Adicional> {
  exigir(ctx, "admin");
  const nome = String(dados?.nome ?? "").trim();
  const preco = Number(dados?.preco);
  if (nome.length < 2) throw new ServiceError("Informe o nome do adicional");
  if (!Number.isFinite(preco) || preco < 0) throw new ServiceError("Preço inválido");
  if (dados.id) {
    const r = await um<Adicional>(`update adicionais set nome=$2, preco=$3 where id=$1 returning id, nome, preco`, [dados.id, nome, preco]);
    if (!r) throw new ServiceError("Adicional não encontrado", "NAO_ENCONTRADO");
    return r;
  }
  return (await um<Adicional>(`insert into adicionais (nome, preco) values ($1,$2) returning id, nome, preco`, [nome, preco]))!;
}

export async function excluirAdicional(ctx: Ctx, id: string): Promise<void> {
  exigir(ctx, "admin");
  await query(`delete from adicionais where id = $1`, [id]);
}

// ------------------------------------------------------------------ setores
export async function salvarSetor(ctx: Ctx, dados: Setor): Promise<Setor> {
  exigir(ctx, "admin");
  const nome = String(dados?.nome ?? "").trim();
  const slug = String(dados?.slug ?? "").trim().toLowerCase();
  if (nome.length < 2) throw new ServiceError("Informe o nome do setor");
  if (!/^[a-z0-9_-]{2,}$/.test(slug)) throw new ServiceError("Identificador: letras minúsculas, números e hífen");
  try {
    if (dados.id) {
      const r = await um<Setor>(`update setores set nome=$2, slug=$3 where id=$1 returning id, nome, slug`, [dados.id, nome, slug]);
      if (!r) throw new ServiceError("Setor não encontrado", "NAO_ENCONTRADO");
      return r;
    }
    return (await um<Setor>(`insert into setores (nome, slug) values ($1,$2) returning id, nome, slug`, [nome, slug]))!;
  } catch (e) {
    return erroAmigavel(e, { "23505": "Já existe um setor com esse identificador" });
  }
}

export async function excluirSetor(ctx: Ctx, id: string): Promise<void> {
  exigir(ctx, "admin");
  const ativos = await um<{ n: number }>(`select count(*)::int as n from produtos where setor_id=$1 and ativo`, [id]);
  if (ativos && ativos.n > 0) throw new ServiceError("Existem produtos vinculados a este setor", "CONFLITO");
  try {
    await query(`delete from setores where id = $1`, [id]);
  } catch (e) {
    return erroAmigavel(e, { "23503": "Este setor tem histórico de pedidos e não pode ser excluído" });
  }
}
