import "server-only";
import { ServiceError } from "@/services/_base";
import type { Estabelecimento, Papel, Usuario } from "@/types";
import { query, tx, um } from "../db";
import { bloqueado, limpar, registrarFalha } from "../limite";
import { exigir, exigirEquipe, exigirTenant, erroAmigavel, type Ctx } from "../comum";
import { situacao } from "../tenant";
import { lerToken } from "../sessao";
import { plano as planoDe, PLANOS } from "@/lib/planos";

const PAPEIS: Papel[] = ["admin", "caixa", "garcom", "cozinha", "bar"];
const USUARIO_SQL = `select id, nome, papel, ativo, login from usuarios`;

export async function login(ctx: Ctx, usuario: unknown, senha: unknown): Promise<Usuario> {
  exigirTenant(ctx);
  const nome = String(usuario ?? "").trim();
  const chave = `login:${ctx.tenant!.id}:${ctx.ip}:${nome.toLowerCase()}`;
  if (bloqueado(chave, 5, 60_000)) {
    throw new ServiceError("Muitas tentativas. Aguarde 1 minuto e tente de novo.", "PROIBIDO");
  }
  const u = await um<Usuario>(
    `${USUARIO_SQL} where lower(login) = lower($1) and senha_hash = crypt($2, senha_hash)`,
    [nome, String(senha ?? "")],
  );
  if (!u) {
    registrarFalha(chave);
    throw new ServiceError("Usuário ou senha incorretos", "PROIBIDO");
  }
  if (!u.ativo) throw new ServiceError("Este acesso está desativado. Fale com o administrador.", "PROIBIDO");
  limpar(chave);
  ctx.iniciarSessao(u);
  return u;
}

/**
 * Entrada direta logo após o cadastro: troca o link curto (10 min) por uma sessão normal.
 * O link só vale no endereço do próprio negócio e para um usuário que ainda existe e está ativo.
 */
export async function entrarComToken(ctx: Ctx, t: unknown): Promise<Usuario> {
  const tenant = exigirTenant(ctx);
  const s = lerToken(String(t ?? ""));
  if (!s || s.tipo !== "entrada" || s.eid !== tenant.id) {
    throw new ServiceError("Este link de acesso expirou. Entre com o usuário e a senha que você criou.", "PROIBIDO");
  }
  const u = await um<Usuario>(`${USUARIO_SQL} where id = $1`, [s.uid]);
  if (!u?.ativo) throw new ServiceError("Este acesso está desativado. Fale com o administrador.", "PROIBIDO");
  ctx.iniciarSessao(u);
  return u;
}

export async function logout(ctx: Ctx) {
  ctx.encerrarSessao();
  return null;
}

/** usuário da sessão atual (ou null) */
export async function sessaoAtual(ctx: Ctx): Promise<Usuario | null> {
  if (!ctx.sessao) return null;
  return (await um<Usuario>(`${USUARIO_SQL} where id = $1`, [ctx.sessao.uid])) ?? null;
}

// ------------------------------------------------------------------ usuários (admin)
export async function listarUsuarios(ctx: Ctx): Promise<Usuario[]> {
  exigir(ctx, "admin");
  return query<Usuario>(`${USUARIO_SQL} order by criado_em, nome`);
}

interface DadosUsuario {
  id?: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
  login: string;
  senha?: string;
}

async function garantirUmAdmin(c: Parameters<typeof um>[2]) {
  const r = await um<{ n: number }>(`select count(*)::int as n from usuarios where papel = 'admin' and ativo`, [], c);
  if (!r || r.n < 1) throw new ServiceError("É preciso manter pelo menos um administrador ativo", "CONFLITO");
}

export async function salvarUsuario(ctx: Ctx, dados: DadosUsuario): Promise<Usuario> {
  exigir(ctx, "admin");
  const nome = String(dados?.nome ?? "").trim();
  const login = String(dados?.login ?? "").trim();
  const senha = dados?.senha ? String(dados.senha) : "";
  if (nome.length < 2) throw new ServiceError("Informe o nome");
  if (!/^[A-Za-z0-9._-]{3,}$/.test(login)) throw new ServiceError("Login: mínimo 3 caracteres, sem espaços");
  if (!PAPEIS.includes(dados.papel)) throw new ServiceError("Papel inválido");
  if (senha && senha.length < 4) throw new ServiceError("A senha precisa de pelo menos 4 caracteres");
  const ativo = dados.ativo !== false;

  // limite de usuários ativos do plano
  const limite = planoDe(ctx.tenant?.plano).limiteUsuarios;
  if (limite !== null && ativo) {
    const r = await um<{ n: number }>(
      `select count(*)::int as n from usuarios where ativo and ($1::text is null or id <> $1)`,
      [dados.id ?? null],
    );
    if (r && r.n >= limite) {
      throw new ServiceError(
        `Seu plano permite até ${limite} usuários ativos. Desative alguém ou mude para o plano ${PLANOS.profissional.nome}.`,
        "CONFLITO",
      );
    }
  }

  try {
    return await tx(async (c) => {
      if (dados.id) {
        const u = await um<Usuario>(
          `update usuarios set nome = $2, papel = $3, ativo = $4, login = $5,
                  senha_hash = case when $6 = '' then senha_hash else crypt($6, gen_salt('bf')) end
           where id = $1 returning id, nome, papel, ativo, login`,
          [dados.id, nome, dados.papel, ativo, login, senha],
          c,
        );
        if (!u) throw new ServiceError("Usuário não encontrado", "NAO_ENCONTRADO");
        await garantirUmAdmin(c);
        return u;
      }
      if (!senha) throw new ServiceError("Defina uma senha");
      const u = await um<Usuario>(
        `insert into usuarios (nome, papel, ativo, login, senha_hash)
         values ($1, $2, $3, $4, crypt($5, gen_salt('bf'))) returning id, nome, papel, ativo, login`,
        [nome, dados.papel, ativo, login, senha],
        c,
      );
      return u!;
    });
  } catch (e) {
    return erroAmigavel(e, { "23505": "Já existe um usuário com esse login" });
  }
}

export async function alternarUsuarioAtivo(ctx: Ctx, id: string): Promise<Usuario> {
  exigir(ctx, "admin");
  return tx(async (c) => {
    const u = await um<Usuario>(
      `update usuarios set ativo = not ativo where id = $1 returning id, nome, papel, ativo, login`,
      [id],
      c,
    );
    if (!u) throw new ServiceError("Usuário não encontrado", "NAO_ENCONTRADO");
    await garantirUmAdmin(c);
    const limite = planoDe(ctx.tenant?.plano).limiteUsuarios;
    if (u.ativo && limite !== null) {
      const r = await um<{ n: number }>(`select count(*)::int as n from usuarios where ativo`, [], c);
      if (r && r.n > limite) {
        throw new ServiceError(`Seu plano permite até ${limite} usuários ativos.`, "CONFLITO");
      }
    }
    return u;
  });
}

// ------------------------------------------------------------------ estabelecimento
const EST_SQL = `select id, nome, logo_url as "logoUrl", taxa_servico_padrao as "taxaServicoPadrao",
  horario_funcionamento as "horarioFuncionamento", mensagem_topo as "mensagemTopo", endereco,
  cor_primaria as "corPrimaria" from estabelecimento limit 1`;

export async function getEstabelecimento(): Promise<Estabelecimento> {
  const e = await um<Estabelecimento>(EST_SQL);
  if (!e) throw new ServiceError("Estabelecimento não configurado", "NAO_ENCONTRADO");
  return e;
}

const COLUNAS_EST: Record<string, string> = {
  nome: "nome",
  logoUrl: "logo_url",
  taxaServicoPadrao: "taxa_servico_padrao",
  horarioFuncionamento: "horario_funcionamento",
  mensagemTopo: "mensagem_topo",
  endereco: "endereco",
  corPrimaria: "cor_primaria",
};

export async function salvarEstabelecimento(ctx: Ctx, dados: Partial<Estabelecimento>): Promise<Estabelecimento> {
  exigir(ctx, "admin");
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(COLUNAS_EST)) {
    if (!(k in (dados ?? {}))) continue;
    let v = (dados as Record<string, unknown>)[k];
    if (k === "taxaServicoPadrao") {
      v = Number(v);
      if (!Number.isFinite(v as number) || (v as number) < 0 || (v as number) > 100) {
        throw new ServiceError("Taxa de serviço deve estar entre 0 e 100%");
      }
    } else if (k === "logoUrl") {
      v = v ? String(v) : null;
      if (v && (v as string).length > 2_000_000) throw new ServiceError("Imagem muito grande (máx. cerca de 1,5 MB)");
    } else if (k === "corPrimaria") {
      v = String(v ?? "").trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(v as string)) throw new ServiceError("Cor inválida (use o formato #RRGGBB)");
    } else {
      v = String(v ?? "");
      if (k === "nome" && !(v as string).trim()) throw new ServiceError("Informe o nome do estabelecimento");
    }
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  }
  if (sets.length) await query(`update estabelecimento set ${sets.join(", ")}`, vals);
  return getEstabelecimento();
}

/**
 * Apaga comandas, pedidos, pagamentos e caixas (os cadastros ficam).
 * DESATIVADO por padrão: só roda com ALLOW_DEMO_RESET=true no ambiente.
 */
export async function resetarDemo(ctx: Ctx): Promise<void> {
  exigir(ctx, "admin");
  if (process.env.ALLOW_DEMO_RESET !== "true") {
    throw new ServiceError(
      "Restaurar dados está desativado neste ambiente, para não apagar o movimento real. Fale com quem administra o sistema.",
      "PROIBIDO",
    );
  }
  await tx(async (c) => {
    await c.query("delete from pagamentos");
    await c.query("delete from item_adicionais");
    await c.query("delete from itens_pedido");
    await c.query("delete from pedidos");
    await c.query("delete from comandas");
    await c.query("delete from caixas");
    await c.query("update estabelecimento set proximo_pedido = 101");
  });
}

// ------------------------------------------------------------------ primeiros passos (painel do admin)
export interface PrimeirosPassos {
  produtos: number;
  usuarios: number;
  temLogo: boolean;
  pedidos: number;
}

export async function getPrimeirosPassos(ctx: Ctx): Promise<PrimeirosPassos> {
  exigir(ctx, "admin");
  const r = await um<PrimeirosPassos>(
    `select (select count(*)::int from produtos where ativo) as produtos,
            (select count(*)::int from usuarios where ativo) as usuarios,
            coalesce((select logo_url is not null from estabelecimento limit 1), false) as "temLogo",
            (select count(*)::int from pedidos) as pedidos`,
  );
  return r ?? { produtos: 0, usuarios: 0, temLogo: false, pedidos: 0 };
}

// ------------------------------------------------------------------ assinatura
export interface Assinatura {
  plano: string;
  planoNome: string;
  precoMensal: number;
  status: string;
  liberado: boolean;
  diasRestantes: number | null;
  motivo?: string;
  pagoAte?: string;
  trialAte?: string;
  pixChave?: string;
  whatsapp?: string;
}

/** situação da assinatura do negócio (funciona mesmo com o sistema bloqueado) */
export async function getAssinatura(ctx: Ctx): Promise<Assinatura> {
  exigirEquipe(ctx);
  const t = exigirTenant(ctx);
  const s = situacao(t);
  const p = planoDe(t.plano);
  return {
    plano: p.id,
    planoNome: p.nome,
    precoMensal: p.precoMensal,
    status: s.status,
    liberado: s.liberado,
    diasRestantes: s.diasRestantes,
    motivo: s.motivo,
    pagoAte: t.pagoAte ?? undefined,
    trialAte: t.trialAte ?? undefined,
    pixChave: process.env.PLATAFORMA_PIX_CHAVE || undefined,
    whatsapp: process.env.PLATAFORMA_WHATSAPP || undefined,
  };
}
