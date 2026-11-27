import "server-only";
import { ServiceError } from "@/services/_base";
import { podeAlternarEstabelecimento } from "@/lib/grupos";
import type { Estabelecimento, Papel, Usuario } from "@/types";
import { poolPlataforma, query, tx, um } from "../db";
import { bloqueado, limpar, registrarFalha } from "../limite";
import { exigir, exigirEquipe, exigirTenant, erroAmigavel, type Ctx } from "../comum";
import { esquecerTenant, situacao } from "../tenant";
import { lerToken } from "../sessao";
import { plano as planoDe, precoProfissionalPorQuantidade, PLANOS, categoriasModeloFaltantes, MODELO_POR_TIPO, TIPOS_NEGOCIO, type TipoNegocio } from "@/lib/planos";

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
  const s = lerToken(String(t ?? ""));
  const tenantId = ctx.tenant?.id ?? s?.eid;
  if (!s || s.tipo !== "entrada" || !tenantId || s.eid !== tenantId) {
    throw new ServiceError("Este link de acesso expirou. Entre com o usuário e a senha que você criou.", "PROIBIDO");
  }
  const u = ctx.tenant
    ? await um<Usuario>(`${USUARIO_SQL} where id = $1`, [s.uid])
    : (await poolPlataforma().query<Usuario>(`${USUARIO_SQL} where estabelecimento_id = $1 and id = $2`, [tenantId, s.uid])).rows[0];
  if (!u?.ativo) throw new ServiceError("Este acesso está desativado. Fale com o administrador.", "PROIBIDO");
  ctx.iniciarSessao(u, tenantId);
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
  cor_primaria as "corPrimaria", modulos,
  fiscal_cnpj as "fiscalCnpj", fiscal_ie as "fiscalIe", fiscal_uf as "fiscalUf",
  fiscal_codigo_municipio as "fiscalCodigoMunicipio", fiscal_regime as "fiscalRegime",
  fiscal_ambiente as "fiscalAmbiente" from estabelecimento limit 1`;

export async function getEstabelecimento(): Promise<Estabelecimento> {
  const e = await um<Estabelecimento>(EST_SQL);
  if (!e) throw new ServiceError("Estabelecimento não configurado", "NAO_ENCONTRADO");
  return e;
}

export async function getTipoNegocio(ctx: Ctx): Promise<string> {
  exigir(ctx, "admin");
  return exigirTenant(ctx).tipo;
}

export interface EstabelecimentoAcessivel {
  id: string;
  slug: string;
  nome: string;
  atual: boolean;
}

export async function listarEstabelecimentosAcessiveis(ctx: Ctx): Promise<EstabelecimentoAcessivel[]> {
  exigir(ctx, "admin");
  const tenant = exigirTenant(ctx);
  if (!ctx.plataformaHost) return [{ id: tenant.id, slug: tenant.slug, nome: tenant.slug, atual: true }];
  const r = await poolPlataforma().query<EstabelecimentoAcessivel>(
    `select t.id, t.slug, e.nome, (t.id=$1) as atual
     from tenants atual
     join tenants t on t.grupo_id=atual.grupo_id and t.status <> 'cancelado'
     join estabelecimento e on e.id=t.id
     where atual.id=$1 order by (t.id=$1) desc, e.nome`,
    [tenant.id],
  );
  return r.rows;
}

/** Alterna a sessão de administrador somente entre lojas vinculadas ao mesmo grupo. */
export async function alternarEstabelecimento(ctx: Ctx, destinoId: unknown): Promise<{ slug: string; nome: string; usuario: Usuario }> {
  const sessao = exigir(ctx, "admin");
  const origem = exigirTenant(ctx);
  if (!ctx.plataformaHost) throw new ServiceError("A troca de estabelecimento só funciona pelo endereço principal", "PROIBIDO");
  const id = String(destinoId ?? "").trim();
  if (!id) throw new ServiceError("Selecione um estabelecimento", "INVALIDO");
  const permitido = await poolPlataforma().query<{ id: string; slug: string; nome: string; mesmoGrupo: boolean; cancelado: boolean }>(
    `select destino.id, destino.slug, e.nome,
            (destino.grupo_id=atual.grupo_id) as "mesmoGrupo", (destino.status='cancelado') as cancelado
     from tenants atual
     join tenants destino on destino.id=$2
     join estabelecimento e on e.id=destino.id
     where atual.id=$1`,
    [origem.id, id],
  );
  const loja = permitido.rows[0];
  if (!loja || !podeAlternarEstabelecimento({ papel: sessao.papel, mesmoGrupo: loja.mesmoGrupo, cancelado: loja.cancelado })) {
    throw new ServiceError("Este estabelecimento não está vinculado ao seu grupo", "PROIBIDO");
  }
  const admin = await poolPlataforma().query<Usuario>(
    `select id, nome, papel, ativo, login from usuarios
     where estabelecimento_id=$1 and papel='admin' and ativo order by criado_em limit 1`,
    [loja.id],
  );
  if (!admin.rows[0]) throw new ServiceError("A loja vinculada ainda não tem um administrador ativo", "CONFLITO");
  ctx.iniciarSessao(admin.rows[0], loja.id);
  return { slug: loja.slug, nome: loja.nome, usuario: admin.rows[0] };
}

export interface EstadoFiscal {
  habilitado: boolean;
  estado: "pendente" | "homologacao" | "producao";
  ambiente: "homologacao" | "producao";
  ausentes: string[];
  tokenConfigurado: boolean;
}

/** Exibe prontidão fiscal sem retornar nem registrar o segredo da Focus. */
export async function getEstadoFiscal(ctx: Ctx): Promise<EstadoFiscal> {
  exigir(ctx, "admin", "caixa");
  const est = await um<{ modulos: Estabelecimento["modulos"]; fiscalCnpj: string; fiscalIe: string; fiscalUf: string; fiscalCodigoMunicipio: string; fiscalRegime: string; fiscalAmbiente: "homologacao" | "producao" }>(
    `select modulos, fiscal_cnpj as "fiscalCnpj", fiscal_ie as "fiscalIe", fiscal_uf as "fiscalUf", fiscal_codigo_municipio as "fiscalCodigoMunicipio", fiscal_regime as "fiscalRegime", fiscal_ambiente as "fiscalAmbiente" from estabelecimento limit 1`,
  );
  const ausentes: string[] = [];
  if (!est?.fiscalCnpj) ausentes.push("CNPJ");
  if (!est?.fiscalIe) ausentes.push("Inscrição estadual");
  if (!est?.fiscalUf) ausentes.push("UF");
  if (!est?.fiscalCodigoMunicipio) ausentes.push("Código IBGE do município");
  if (!est?.fiscalRegime) ausentes.push("Regime tributário");
  const tokenConfigurado = !!process.env.FOCUS_NFE_TOKEN;
  if (!tokenConfigurado) ausentes.push("Credencial Focus NFe no servidor");
  const ambiente = est?.fiscalAmbiente === "producao" ? "producao" : "homologacao";
  return { habilitado: !!est?.modulos?.nfce, ambiente, ausentes, tokenConfigurado,
    estado: ausentes.length ? "pendente" : ambiente };
}

const COLUNAS_EST: Record<string, string> = {
  nome: "nome",
  logoUrl: "logo_url",
  taxaServicoPadrao: "taxa_servico_padrao",
  horarioFuncionamento: "horario_funcionamento",
  mensagemTopo: "mensagem_topo",
  endereco: "endereco",
  corPrimaria: "cor_primaria",
  modulos: "modulos",
  fiscalCnpj: "fiscal_cnpj",
  fiscalIe: "fiscal_ie",
  fiscalUf: "fiscal_uf",
  fiscalCodigoMunicipio: "fiscal_codigo_municipio",
  fiscalRegime: "fiscal_regime",
  fiscalAmbiente: "fiscal_ambiente",
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
    } else if (k === "modulos") {
      const m = v as Estabelecimento["modulos"];
      if (!m || typeof m.balcao !== "boolean" || typeof m.estoque !== "boolean" || typeof m.nfce !== "boolean") {
        throw new ServiceError("Selecione opções válidas para o estabelecimento");
      }
      if (m.nfce && !m.balcao) throw new ServiceError("A emissão fiscal precisa do módulo de caixa de balcão");
      v = JSON.stringify(m);
    } else if (k === "fiscalAmbiente") {
      if (v !== "homologacao" && v !== "producao") throw new ServiceError("Ambiente fiscal inválido");
    } else if (k === "fiscalCnpj") {
      const cnpj = String(v ?? "").replace(/\D/g, "");
      if (cnpj && cnpj.length !== 14) throw new ServiceError("CNPJ fiscal deve ter 14 dígitos");
      v = cnpj;
    } else if (k === "fiscalUf") {
      v = String(v ?? "").trim().toUpperCase();
      if (v && !/^[A-Z]{2}$/.test(v as string)) throw new ServiceError("Informe a UF com duas letras");
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

/** Aplica o modelo sem apagar produtos, categorias nem nomes de setores existentes. */
export async function aplicarModeloTipoNegocio(ctx: Ctx, tipoBruto: unknown): Promise<{ tipo: TipoNegocio; categoriasAdicionadas: string[]; setoresAdicionados: string[] }> {
  exigir(ctx, "admin");
  const tenant = exigirTenant(ctx);
  const tipo = String(tipoBruto ?? "") as TipoNegocio;
  if (!TIPOS_NEGOCIO.some((x) => x.id === tipo)) throw new ServiceError("Selecione um tipo de negócio válido");
  const modelo = MODELO_POR_TIPO[tipo];
  const c = await poolPlataforma().connect();
  const categoriasAdicionadas: string[] = [];
  const setoresAdicionados: string[] = [];
  try {
    await c.query("begin");
    await c.query("select set_config('app.eid', $1, true)", [tenant.id]);
    await c.query("set local role app_rls");
    await c.query("select pg_advisory_xact_lock(hashtext($1))", [`modelo:${tenant.id}`]);

    const categorias = await c.query<{ nome: string }>("select nome from categorias");
    const faltantes = categoriasModeloFaltantes(tipo, categorias.rows.map((x) => x.nome));
    for (const nome of faltantes) {
      const r = await c.query(
        `insert into categorias (nome, ordem, ativa)
         select $1, coalesce((select max(ordem) + 10 from categorias), 10), true
         where not exists (select 1 from categorias c where lower(c.nome) = lower($1))
         returning nome`,
        [nome],
      );
      if (r.rowCount) categoriasAdicionadas.push(nome);
    }

    const setores = await c.query<{ slug: string }>("select slug from setores");
    const existentes = new Set(setores.rows.map((x) => x.slug));
    for (const setor of modelo.setores) {
      if (existentes.has(setor.slug)) continue;
      const r = await c.query("insert into setores (slug, nome) values ($1, $2) on conflict (estabelecimento_id, slug) do nothing returning id", [setor.slug, setor.nome]);
      if (r.rowCount) setoresAdicionados.push(setor.nome);
    }

    await c.query("reset role");
    const atualizado = await c.query("update tenants set tipo=$2 where id=$1", [tenant.id, tipo]);
    if (!atualizado.rowCount) throw new ServiceError("Estabelecimento não encontrado", "NAO_ENCONTRADO");
    await c.query("commit");
    esquecerTenant(tenant.slug);
    return { tipo, categoriasAdicionadas, setoresAdicionados };
  } catch (e) {
    await c.query("rollback").catch(() => {});
    if ((e as { code?: string })?.code === "23514") throw new ServiceError("Este tipo ainda não foi liberado no banco. Aplique a migração mais recente.", "CONFLITO");
    throw e;
  } finally {
    c.release();
  }
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
  pedidosQr: number;
  tipoNegocio: string;
  modulos: { balcao: boolean; estoque: boolean; nfce: boolean };
  comCodigoBarras: number;
  comEstoque: number;
  vendasBalcao: number;
  setores: number;
  comandasFechadas: number;
}

export async function getPrimeirosPassos(ctx: Ctx): Promise<PrimeirosPassos> {
  exigir(ctx, "admin");
  const r = await um<PrimeirosPassos>(
    `select (select count(*)::int from produtos where ativo) as produtos,
            (select count(*)::int from usuarios where ativo) as usuarios,
            coalesce((select logo_url is not null from estabelecimento limit 1), false) as "temLogo",
            (select count(*)::int from pedidos) as pedidos,
            (select count(*)::int from pedidos where origem='cliente') as "pedidosQr",
            $1::text as "tipoNegocio",
            coalesce((select modulos from estabelecimento limit 1), '{"balcao":false,"estoque":false,"nfce":false}'::jsonb) as modulos,
            (select count(*)::int from produtos where ativo and codigo_barras is not null and codigo_barras <> '') as "comCodigoBarras",
            (select count(*)::int from produtos where ativo and controla_estoque) as "comEstoque",
            (select count(*)::int from vendas_balcao where status='concluida') as "vendasBalcao",
            (select count(*)::int from setores) as setores,
            (select count(*)::int from comandas where status='fechada') as "comandasFechadas"`,
    [ctx.tenant?.tipo ?? "outro"],
  );
  return r ?? { produtos: 0, usuarios: 0, temLogo: false, pedidos: 0, pedidosQr: 0, tipoNegocio: "outro", modulos: { balcao: false, estoque: false, nfce: false }, comCodigoBarras: 0, comEstoque: 0, vendasBalcao: 0, setores: 0, comandasFechadas: 0 };
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

export interface SolicitacaoEstabelecimento {
  id: string;
  quantidade: number;
  valorMensal: number;
  status: "pendente" | "em_contato" | "resolvida";
  criadaEm: string;
}

/** Registra uma contratação/inclusão para análise; não muda tenant ativo nem libera outras lojas. */
export async function solicitarEstabelecimentos(ctx: Ctx, quantidade: number): Promise<SolicitacaoEstabelecimento> {
  exigir(ctx, "admin");
  const tenant = exigirTenant(ctx);
  const unidades = Number(quantidade);
  if (!Number.isInteger(unidades) || unidades < 1 || unidades > 20) {
    throw new ServiceError("Escolha de 1 a 20 estabelecimentos");
  }
  const valor = precoProfissionalPorQuantidade(unidades);
  const r = await poolPlataforma().query<SolicitacaoEstabelecimento>(
    `insert into solicitacoes_estabelecimentos (tenant_id, quantidade, valor_mensal)
     values ($1,$2,$3)
     on conflict (tenant_id) where status = 'pendente'
     do update set quantidade = excluded.quantidade, valor_mensal = excluded.valor_mensal, atualizado_em = now()
     returning id, quantidade, valor_mensal::float8 as "valorMensal", status, criado_em as "criadaEm"`,
    [tenant.id, unidades, valor],
  );
  return r.rows[0];
}
