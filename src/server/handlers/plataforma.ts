import "server-only";
import { randomBytes } from "node:crypto";
import { normalizarCelular } from "@/lib/celular";
import { slugReservado, urlDaPlataforma } from "@/lib/host";
import { MODELO_POR_TIPO, PRODUTO, TIPOS_NEGOCIO, type TipoNegocio } from "@/lib/planos";
import { ServiceError } from "@/services/_base";
import type { Usuario } from "@/types";
import { poolPlataforma } from "../db";
import { bloqueado, limpar, registrarFalha } from "../limite";
import { criarToken, senhaPlataformaConfere } from "../sessao";
import { esquecerTenant } from "../tenant";
import type { Ctx } from "../comum";

/**
 * Operações do domínio principal (site do produto). Elas não pertencem a nenhum negócio,
 * então usam o pool da plataforma diretamente, sempre com o estabelecimento explícito.
 */

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

function normalizarSlug(v: unknown) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function verificarSlug(_ctx: Ctx, slugBruto: string): Promise<{ slug: string; disponivel: boolean; motivo?: string }> {
  const slug = normalizarSlug(slugBruto);
  if (slug.length < 3 || !SLUG_RE.test(slug)) return { slug, disponivel: false, motivo: "Use pelo menos 3 letras ou números" };
  if (slugReservado(slug)) return { slug, disponivel: false, motivo: "Endereço reservado" };
  const r = await poolPlataforma().query(`select 1 from tenants where slug = $1`, [slug]);
  return r.rowCount ? { slug, disponivel: false, motivo: "Esse endereço já está em uso" } : { slug, disponivel: true };
}

export interface NovoNegocio {
  nomeNegocio: string;
  tipo: TipoNegocio;
  slug: string;
  responsavelNome: string;
  email: string;
  celular: string;
  login: string;
  senha: string;
}

/** validade do link que leva o dono direto para dentro do sistema logo após o cadastro */
const ENTRADA_MS = 10 * 60_000;

/** cadastro self-service: cria o negócio, o administrador e um cardápio inicial pelo tipo */
export async function cadastrarNegocio(ctx: Ctx, d: NovoNegocio): Promise<{ slug: string; url: string; entrada: string }> {
  const chave = `cadastro:${ctx.ip}`;
  if (bloqueado(chave, 5, 60 * 60_000)) {
    throw new ServiceError("Muitos cadastros a partir desta conexão. Tente de novo mais tarde.", "PROIBIDO");
  }
  const nomeNegocio = String(d?.nomeNegocio ?? "").trim();
  const responsavel = String(d?.responsavelNome ?? "").trim();
  const email = String(d?.email ?? "").trim().toLowerCase();
  const celular = normalizarCelular(String(d?.celular ?? ""));
  const login = String(d?.login ?? "").trim();
  const senha = String(d?.senha ?? "");
  const tipo = TIPOS_NEGOCIO.some((t) => t.id === d?.tipo) ? d.tipo : "outro";

  if (nomeNegocio.length < 2) throw new ServiceError("Informe o nome do negócio");
  if (responsavel.length < 2) throw new ServiceError("Informe seu nome");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ServiceError("E-mail inválido");
  if (!celular) throw new ServiceError("Celular inválido. Use DDD + número");
  if (!/^[A-Za-z0-9._-]{3,}$/.test(login)) throw new ServiceError("Usuário: mínimo 3 caracteres, sem espaços");
  if (senha.length < 8) throw new ServiceError("A senha precisa de pelo menos 8 caracteres");

  const v = await verificarSlug(ctx, d?.slug);
  if (!v.disponivel) throw new ServiceError(`Endereço: ${v.motivo}`, "CONFLITO");

  const id = `est_${randomBytes(8).toString("hex")}`;
  const modelo = MODELO_POR_TIPO[tipo];
  const c = await poolPlataforma().connect();
  let adminId = "";
  try {
    await c.query("begin");
    await c.query(
      `insert into tenants (id, slug, tipo, plano, status, trial_ate, responsavel_nome, responsavel_email, responsavel_celular)
       values ($1, $2, $3, 'profissional', 'trial', now() + make_interval(days => $4), $5, $6, $7)`,
      [id, v.slug, tipo, PRODUTO.diasTeste, responsavel, email, celular],
    );
    // daqui em diante tudo é gravado como sendo deste negócio (default das colunas = app.eid)
    await c.query("select set_config('app.eid', $1, true)", [id]);
    await c.query("set local role app_rls");
    await c.query(`insert into estabelecimento (id, nome) values ($1, $2)`, [id, nomeNegocio]);
    const adm = await c.query<{ id: string }>(
      `insert into usuarios (nome, papel, login, senha_hash) values ($1, 'admin', $2, crypt($3, gen_salt('bf'))) returning id`,
      [responsavel, login, senha],
    );
    adminId = adm.rows[0].id;
    for (const s of modelo.setores) {
      await c.query(`insert into setores (nome, slug) values ($1, $2)`, [s.nome, s.slug]);
    }
    for (const [i, nome] of modelo.categorias.entries()) {
      await c.query(`insert into categorias (nome, ordem, ativa) values ($1, $2, true)`, [nome, (i + 1) * 10]);
    }
    await c.query("commit");
  } catch (e) {
    await c.query("rollback").catch(() => {});
    if ((e as { code?: string })?.code === "23505") throw new ServiceError("Esse endereço acabou de ser usado. Escolha outro.", "CONFLITO");
    throw e;
  } finally {
    c.release();
  }
  registrarFalha(chave); // conta cadastros por IP (não é falha, é limite de volume)
  esquecerTenant(v.slug);
  const entrada = criarToken({ uid: adminId, papel: "admin", eid: id, tipo: "entrada" }, ENTRADA_MS);
  return { slug: v.slug, url: urlDaPlataforma(), entrada };
}

// ------------------------------------------------------------------ login único (site do produto)
export interface ContaAcesso {
  nome: string;
  slug: string;
  /** endereço que já entra logado (link curto de entrada) */
  url: string;
}

/**
 * Login pelo site do produto, sem precisar saber o endereço do negócio:
 * e-mail do responsável (do cadastro) + senha de um administrador daquele negócio.
 * Devolve os negócios em que a senha confere, cada um com o link que já entra logado.
 */
export async function acessarConta(ctx: Ctx, emailBruto: unknown, senhaBruta: unknown): Promise<ContaAcesso[]> {
  const email = String(emailBruto ?? "").trim().toLowerCase();
  const senha = String(senhaBruta ?? "");
  const chave = `acessar:${ctx.ip}:${email}`;
  if (bloqueado(chave, 5, 15 * 60_000)) throw new ServiceError("Muitas tentativas. Aguarde 15 minutos e tente de novo.", "PROIBIDO");
  if (!email || !senha) throw new ServiceError("Informe o e-mail e a senha");

  // negócios deste e-mail em que algum administrador ativo tem essa senha
  // (camada de plataforma: consulta com o estabelecimento explícito, fora do escopo de um negócio)
  const r = await poolPlataforma().query<{ eid: string; slug: string; nome: string; uid: string }>(
    `select distinct on (t.id) t.id as eid, t.slug, e.nome, u.id as uid
       from tenants t
       join estabelecimento e on e.id = t.id
       join usuarios u on u.estabelecimento_id = t.id and u.papel = 'admin' and u.ativo
      where lower(t.responsavel_email) = $1
        and t.status <> 'cancelado'
        and u.senha_hash = crypt($2, u.senha_hash)
      order by t.id, u.criado_em`,
    [email, senha],
  );
  if (!r.rowCount) {
    registrarFalha(chave);
    throw new ServiceError("E-mail ou senha incorretos", "PROIBIDO");
  }
  return r.rows
    .map((x) => ({
      nome: x.nome,
      slug: x.slug,
      url: `${urlDaPlataforma()}/entrar?empresa=${encodeURIComponent(x.slug)}&t=${encodeURIComponent(
        criarToken({ uid: x.uid, papel: "admin", eid: x.eid, tipo: "entrada" }, ENTRADA_MS),
      )}`,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Login central de funcionário: o código da empresa escolhe o tenant antes de validar as credenciais. */
export async function loginEmpresa(ctx: Ctx, slugBruto: unknown, usuarioBruto: unknown, senhaBruta: unknown): Promise<Usuario> {
  const slug = String(slugBruto ?? "").trim().toLowerCase();
  const login = String(usuarioBruto ?? "").trim();
  const senha = String(senhaBruta ?? "");
  if (!slug || !login || !senha) throw new ServiceError("Informe o código da empresa, usuário e senha");

  const chave = `login:${ctx.ip}:${slug}:${login.toLowerCase()}`;
  if (bloqueado(chave, 5, 60_000)) throw new ServiceError("Muitas tentativas. Aguarde 1 minuto e tente de novo.", "PROIBIDO");

  const r = await poolPlataforma().query<Usuario & { eid: string }>(
    `select u.id, u.nome, u.papel, u.ativo, u.login, t.id as eid
       from tenants t
       join usuarios u on u.estabelecimento_id = t.id
      where t.slug = $1 and t.status <> 'cancelado'
        and lower(u.login) = lower($2) and u.ativo
        and u.senha_hash = crypt($3, u.senha_hash)
      limit 1`,
    [slug, login, senha],
  );
  const u = r.rows[0];
  if (!u) {
    registrarFalha(chave);
    throw new ServiceError("Empresa, usuário ou senha incorretos", "PROIBIDO");
  }
  limpar(chave);
  const { eid, ...usuario } = u;
  ctx.iniciarSessao(usuario, eid);
  return usuario;
}

// ------------------------------------------------------------------ painel do dono da plataforma
function exigirPlataforma(ctx: Ctx) {
  if (!ctx.plataformaLogada) throw new ServiceError("Entre no painel da plataforma", "PROIBIDO");
}

export async function plataformaEntrar(ctx: Ctx, senha: string): Promise<boolean> {
  const chave = `plat:${ctx.ip}`;
  if (bloqueado(chave, 5, 15 * 60_000)) throw new ServiceError("Muitas tentativas. Aguarde 15 minutos.", "PROIBIDO");
  if (!senhaPlataformaConfere(String(senha ?? ""))) {
    registrarFalha(chave);
    throw new ServiceError("Senha incorreta (ou PLATAFORMA_SENHA não configurada)", "PROIBIDO");
  }
  ctx.iniciarSessaoPlataforma();
  return true;
}

export async function plataformaSair(ctx: Ctx) {
  ctx.encerrarSessao();
  return null;
}

export async function plataformaSessao(ctx: Ctx): Promise<boolean> {
  return ctx.plataformaLogada;
}

export interface NegocioResumo {
  id: string;
  slug: string;
  nome: string;
  tipo: string;
  plano: string;
  status: string;
  trialAte?: string;
  pagoAte?: string;
  responsavelNome?: string;
  responsavelEmail?: string;
  responsavelCelular?: string;
  observacao: string;
  criadoEm: string;
  comandas30d: number;
  ultimoPedido?: string;
}

export async function plataformaListar(ctx: Ctx): Promise<NegocioResumo[]> {
  exigirPlataforma(ctx);
  const r = await poolPlataforma().query<NegocioResumo>(
    `select t.id, t.slug, e.nome, t.tipo, t.plano, t.status, t.trial_ate as "trialAte", t.pago_ate as "pagoAte",
            t.responsavel_nome as "responsavelNome", t.responsavel_email as "responsavelEmail",
            t.responsavel_celular as "responsavelCelular", t.observacao, t.criado_em as "criadoEm",
            (select count(*)::int from comandas c where c.estabelecimento_id = t.id
               and c.aberta_em >= now() - interval '30 days') as "comandas30d",
            (select max(p.criado_em) from pedidos p where p.estabelecimento_id = t.id) as "ultimoPedido"
     from tenants t join estabelecimento e on e.id = t.id
     order by t.criado_em desc`,
  );
  return r.rows;
}

export async function plataformaAtualizar(
  ctx: Ctx,
  id: string,
  d: { status?: string; plano?: string; pagoAte?: string | null; trialAte?: string | null; observacao?: string },
): Promise<void> {
  exigirPlataforma(ctx);
  const status = d?.status && ["trial", "ativo", "suspenso", "cancelado"].includes(d.status) ? d.status : null;
  const plano = d?.plano && ["essencial", "profissional"].includes(d.plano) ? d.plano : null;
  const data = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const r = await poolPlataforma().query<{ slug: string }>(
    `update tenants set
       status = coalesce($2, status),
       plano = coalesce($3, plano),
       pago_ate = case when $4::boolean then ($5::date + time '23:59')::timestamp at time zone 'America/Sao_Paulo' else pago_ate end,
       trial_ate = case when $6::boolean then ($7::date + time '23:59')::timestamp at time zone 'America/Sao_Paulo' else trial_ate end,
       observacao = coalesce($8, observacao)
     where id = $1 returning slug`,
    [
      String(id),
      status,
      plano,
      d?.pagoAte !== undefined,
      data(d?.pagoAte),
      d?.trialAte !== undefined,
      data(d?.trialAte),
      d?.observacao === undefined ? null : String(d.observacao).slice(0, 500),
    ],
  );
  if (!r.rowCount) throw new ServiceError("Negócio não encontrado", "NAO_ENCONTRADO");
  esquecerTenant(r.rows[0].slug);
}
