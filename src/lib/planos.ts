/**
 * Produto, planos e tipos de negócio. Tudo que é "comercial" fica aqui para mudar num lugar só.
 * Valores comerciais vigentes do Comandou.
 */
export const PRODUTO = {
  nome: process.env.NEXT_PUBLIC_PRODUTO_NOME || "Comandou",
  slogan: "Cardápio por QR, pedidos direto na cozinha e caixa no mesmo sistema.",
  diasTeste: 14,
};

export type PlanoId = "profissional";

export interface Plano {
  id: PlanoId;
  nome: string;
  precoMensal: number;
  limiteUsuarios: number | null; // null = sem limite
  destaque?: boolean;
  itens: string[];
}

/** Preço do Profissional para uma conta com vários estabelecimentos. */
export function precoProfissionalPorQuantidade(quantidade: number): number {
  const unidades = Math.max(1, Math.floor(Number.isFinite(quantidade) ? quantidade : 1));
  return 139 + (unidades - 1) * 120;
}

export function receitaProfissionalPorGrupos(estabelecimentos: {
  id: string; grupoId?: string | null; status: string; estabelecimentosNoGrupo?: number;
}[]): number {
  const ativosPorGrupo = new Map<string, number>();
  for (const estabelecimento of estabelecimentos) {
    if (estabelecimento.status !== "ativo") continue;
    const grupo = estabelecimento.grupoId || estabelecimento.id;
    const quantidade = Math.max(1, Number(estabelecimento.estabelecimentosNoGrupo) || 1);
    ativosPorGrupo.set(grupo, Math.max(ativosPorGrupo.get(grupo) ?? 0, quantidade));
  }
  return [...ativosPorGrupo.values()].reduce((total, quantidade) => total + precoProfissionalPorQuantidade(quantidade), 0);
}

export const PLANOS: Record<PlanoId, Plano> = {
  profissional: {
    id: "profissional",
    nome: "Profissional",
    precoMensal: 139,
    limiteUsuarios: null,
    destaque: true,
    itens: [
      "Cardápio digital com QR por comanda",
      "Pedidos do cliente e do garçom",
      "Telas de produção (cozinha, bar, chapa)",
      "Caixa com baixa e fechamento",
      "Usuários ilimitados",
      "Painel com faturamento, ticket médio e mais vendidos",
      "Histórico completo de comandas",
      "Suporte prioritário pelo WhatsApp",
    ],
  },
};

export function plano(id: string | null | undefined): Plano {
  return PLANOS[(id as PlanoId) in PLANOS ? (id as PlanoId) : "profissional"];
}

export type TipoNegocio = "bar" | "restaurante" | "hamburgueria" | "lanchonete" | "pizzaria" | "cafeteria" | "casa_carnes" | "outro";

const TIPOS_COM_COMANDAS: TipoNegocio[] = ["bar", "restaurante", "hamburgueria", "lanchonete", "pizzaria", "cafeteria", "casa_carnes"];

export function usaFluxoComandas(tipo: string): boolean {
  return TIPOS_COM_COMANDAS.includes(tipo as TipoNegocio);
}

export const TIPOS_NEGOCIO: { id: TipoNegocio; label: string }[] = [
  { id: "bar", label: "Bar / choperia" },
  { id: "restaurante", label: "Restaurante" },
  { id: "hamburgueria", label: "Hamburgueria" },
  { id: "lanchonete", label: "Lanchonete" },
  { id: "pizzaria", label: "Pizzaria" },
  { id: "cafeteria", label: "Cafeteria" },
  { id: "casa_carnes", label: "Casa de carnes / churrascaria" },
  { id: "outro", label: "Outro" },
];

/**
 * Setores de produção e categorias iniciais de cada tipo.
 * Os slugs dos setores são sempre "cozinha" e "bar" porque os papéis de produção da equipe
 * usam esses dois nomes; o que muda é o nome que aparece na tela (ex.: "Chapa").
 */
export const MODELO_POR_TIPO: Record<TipoNegocio, { setores: { slug: "cozinha" | "bar"; nome: string }[]; categorias: string[] }> = {
  bar: {
    setores: [{ slug: "cozinha", nome: "Cozinha" }, { slug: "bar", nome: "Bar" }],
    categorias: ["Chopp", "Cervejas", "Drinks", "Sem álcool", "Petiscos", "Porções"],
  },
  restaurante: {
    setores: [{ slug: "cozinha", nome: "Cozinha" }, { slug: "bar", nome: "Bebidas" }],
    categorias: ["Entradas", "Pratos principais", "Massas", "Sobremesas", "Bebidas"],
  },
  hamburgueria: {
    setores: [{ slug: "cozinha", nome: "Chapa" }, { slug: "bar", nome: "Bebidas" }],
    categorias: ["Hambúrgueres", "Combos", "Porções", "Milkshakes", "Bebidas"],
  },
  lanchonete: {
    setores: [{ slug: "cozinha", nome: "Cozinha" }, { slug: "bar", nome: "Balcão" }],
    categorias: ["Lanches", "Salgados", "Pratos rápidos", "Sucos", "Bebidas"],
  },
  pizzaria: {
    setores: [{ slug: "cozinha", nome: "Forno" }, { slug: "bar", nome: "Bebidas" }],
    categorias: ["Pizzas salgadas", "Pizzas doces", "Entradas", "Bebidas"],
  },
  cafeteria: {
    setores: [{ slug: "cozinha", nome: "Cozinha" }, { slug: "bar", nome: "Barista" }],
    categorias: ["Cafés", "Bebidas geladas", "Salgados", "Doces"],
  },
  casa_carnes: {
    setores: [{ slug: "cozinha", nome: "Churrasqueira" }, { slug: "bar", nome: "Bebidas" }],
    categorias: ["Carnes", "Cortes especiais", "Acompanhamentos", "Cervejas", "Bebidas", "Mercearia"],
  },
  outro: {
    setores: [{ slug: "cozinha", nome: "Cozinha" }, { slug: "bar", nome: "Bar" }],
    categorias: ["Comidas", "Bebidas"],
  },
};

/** Retorna apenas as categorias de modelo que ainda não existem no cadastro. */
export function categoriasModeloFaltantes(tipo: TipoNegocio, atuais: string[]): string[] {
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  const existentes = new Set(atuais.map(normalizar));
  return MODELO_POR_TIPO[tipo].categorias.filter((nome) => !existentes.has(normalizar(nome)));
}
