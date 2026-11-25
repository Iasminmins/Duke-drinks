/**
 * Produto, planos e tipos de negócio. Tudo que é "comercial" fica aqui para mudar num lugar só.
 * Os preços são uma sugestão inicial: ajuste à vontade.
 */
export const PRODUTO = {
  nome: process.env.NEXT_PUBLIC_PRODUTO_NOME || "Comandou",
  slogan: "Cardápio por QR, pedidos direto na cozinha e caixa no mesmo sistema.",
  diasTeste: 14,
};

export type PlanoId = "essencial" | "profissional";

export interface Plano {
  id: PlanoId;
  nome: string;
  precoMensal: number;
  limiteUsuarios: number | null; // null = sem limite
  destaque?: boolean;
  itens: string[];
}

export const PLANOS: Record<PlanoId, Plano> = {
  essencial: {
    id: "essencial",
    nome: "Essencial",
    precoMensal: 89,
    limiteUsuarios: 5,
    itens: [
      "Cardápio digital com QR por comanda",
      "Pedidos do cliente e do garçom",
      "Telas de produção (cozinha, bar, chapa)",
      "Caixa com baixa e fechamento",
      "Até 5 usuários da equipe",
    ],
  },
  profissional: {
    id: "profissional",
    nome: "Profissional",
    precoMensal: 149,
    limiteUsuarios: null,
    destaque: true,
    itens: [
      "Tudo do Essencial",
      "Usuários ilimitados",
      "Painel com faturamento, ticket médio e mais vendidos",
      "Histórico completo de comandas",
      "Suporte prioritário pelo WhatsApp",
    ],
  },
};

export function plano(id: string | null | undefined): Plano {
  return PLANOS[(id as PlanoId) in PLANOS ? (id as PlanoId) : "essencial"];
}

export type TipoNegocio = "bar" | "restaurante" | "hamburgueria" | "lanchonete" | "pizzaria" | "cafeteria" | "casa_carnes" | "outro";

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
