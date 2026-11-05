// Entidades do sistema. Os mesmos tipos serão usados quando a API real entrar.

export type ID = string;
export type ISODate = string;

export type Papel = "admin" | "caixa" | "garcom" | "cozinha" | "bar";

export type StatusComanda = "aberta" | "aguardando_pagamento" | "fechada" | "cancelada";
export type StatusPedido = "recebido" | "preparando" | "pronto" | "entregue" | "cancelado";
export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito" | "outro";
export type StatusMesa = "livre" | "ocupada" | "chamando" | "aguardando_pagamento";

export interface Estabelecimento {
  id: ID;
  nome: string;
  logoUrl?: string;
  taxaServicoPadrao: number; // em %
  horarioFuncionamento: string;
  mensagemTopo: string;
  endereco: string;
}

export interface Usuario {
  id: ID;
  nome: string;
  papel: Papel;
  ativo: boolean;
  /** nome de acesso (ex.: "rafael") */
  login: string;
  /** senha — só existe na demo (guardada em texto no navegador); no back-end real vira hash */
  senha?: string;
}

export interface Setor {
  id: ID;
  nome: string;
  slug: "cozinha" | "bar" | string;
}

export interface Categoria {
  id: ID;
  nome: string;
  ordem: number;
  ativa: boolean;
}

export interface Adicional {
  id: ID;
  nome: string;
  preco: number;
}

export interface Produto {
  id: ID;
  nome: string;
  descricao: string;
  preco: number;
  categoriaId: ID;
  setorId: ID;
  imagemUrl?: string;
  adicionaisIds: ID[];
  esgotado: boolean;
  ativo: boolean;
  destaque?: boolean;
}

export interface Mesa {
  id: ID;
  numero: number;
  lugares: number;
  ativa: boolean;
}

export interface Comanda {
  id: ID;
  mesaId: ID;
  mesaNumero: number;
  /** código curto que o garçom passa ao cliente para liberar pedidos pelo QR */
  codigo: string;
  status: StatusComanda;
  abertaEm: ISODate;
  abertaPor: ID;
  fechadaEm?: ISODate;
  fechadaPor?: ID;
  cobrarTaxaServico: boolean;
  desconto: number;
  chamandoGarcom: boolean;
  chamadoEm?: ISODate;
  /** quem é o dono da comanda (preenchido pelo garçom ou pelo próprio cliente no QR) */
  clienteNome?: string;
  /** só dígitos, com DDD (ex.: 24999998888) */
  clienteCelular?: string;
}

export interface ItemAdicional {
  adicionalId: ID;
  nome: string;
  preco: number;
}

export interface ItemPedido {
  id: ID;
  produtoId: ID;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  adicionais: ItemAdicional[];
  observacao?: string;
  setorId: ID;
  status: StatusPedido;
}

export interface Pedido {
  id: ID;
  numero: number;
  comandaId: ID;
  mesaNumero: number;
  origem: "cliente" | "garcom";
  criadoEm: ISODate;
  atualizadoEm: ISODate;
  itens: ItemPedido[];
}

export interface Pagamento {
  id: ID;
  comandaId: ID;
  caixaId: ID;
  forma: FormaPagamento;
  valor: number;
  valorRecebido?: number;
  troco?: number;
  usuarioId: ID;
  criadoEm: ISODate;
  estornado: boolean;
  motivoEstorno?: string;
  estornadoPor?: ID;
  estornadoEm?: ISODate;
}

export interface Caixa {
  id: ID;
  abertoPor: ID;
  abertoEm: ISODate;
  fundoInicial: number;
  fechadoEm?: ISODate;
  fechadoPor?: ID;
  valoresContados?: Partial<Record<FormaPagamento, number>>;
}

/** Ticket = itens de um pedido que pertencem a um setor (o que aparece no KDS) */
export interface TicketKds {
  pedidoId: ID;
  numero: number;
  mesaNumero: number;
  /** nome do dono da comanda, quando houver (ajuda a separar comandas da mesma mesa) */
  clienteNome?: string;
  criadoEm: ISODate;
  status: StatusPedido;
  itens: ItemPedido[];
}

export interface TotaisComanda {
  subtotal: number;
  taxaServico: number;
  desconto: number;
  total: number;
  pago: number;
  restante: number;
}

export interface ComandaDetalhada extends Comanda {
  pedidos: Pedido[];
  pagamentos: Pagamento[];
  totais: TotaisComanda;
}

export interface MesaComStatus extends Mesa {
  status: StatusMesa;
  /** primeira comanda ativa (atalho) */
  comanda?: Comanda;
  /** todas as comandas ativas da mesa (pode haver várias: comandas individuais) */
  comandas: Comanda[];
  /** soma de todas as comandas ativas */
  totalParcial?: number;
}

export interface Notificacao {
  id: ID;
  tipo: "chamado" | "pronto" | "conta";
  mesaNumero: number;
  mensagem: string;
  criadoEm: ISODate;
  refId: ID;
}

export interface ResumoDashboard {
  faturamentoDia: number;
  ticketMedio: number;
  comandasFechadas: number;
  comandasAbertas: number;
  maisVendidos: { nome: string; quantidade: number; total: number }[];
  porHora: { hora: string; total: number }[];
  porForma: { forma: FormaPagamento; total: number }[];
}
