import "server-only";
import type { Ctx } from "./comum";
import * as acesso from "./handlers/acesso";
import * as cardapio from "./handlers/cardapio";
import * as mesas from "./handlers/mesas";
import * as comandas from "./handlers/comandas";
import * as pedidos from "./handlers/pedidos";
import * as caixa from "./handlers/caixa";
import * as relatorios from "./handlers/relatorios";
import * as plataforma from "./handlers/plataforma";
import * as balcao from "./handlers/balcao";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type H = (ctx: Ctx, ...args: any[]) => Promise<unknown>;

/**
 * Só o que está aqui pode ser chamado pelo navegador (POST /api/rpc/<nome>).
 * A autorização (papel da equipe ou código da comanda) é conferida dentro de cada função.
 */
export const REGISTRO: Record<string, H> = {
  // acesso
  login: acesso.login,
  entrarComToken: acesso.entrarComToken,
  logout: acesso.logout,
  sessaoAtual: acesso.sessaoAtual,
  listarUsuarios: acesso.listarUsuarios,
  salvarUsuario: acesso.salvarUsuario,
  alternarUsuarioAtivo: acesso.alternarUsuarioAtivo,
  getEstabelecimento: acesso.getEstabelecimento,
  salvarEstabelecimento: acesso.salvarEstabelecimento,
  resetarDemo: acesso.resetarDemo,
  // cardápio
  getCardapio: cardapio.getCardapio,
  getCardapioAdmin: cardapio.getCardapioAdmin,
  salvarProduto: cardapio.salvarProduto,
  gerarCodigoBarrasInterno: cardapio.gerarCodigoBarrasInterno,
  alternarEsgotado: cardapio.alternarEsgotado,
  excluirProduto: cardapio.excluirProduto,
  salvarCategoria: cardapio.salvarCategoria,
  excluirCategoria: cardapio.excluirCategoria,
  salvarAdicional: cardapio.salvarAdicional,
  excluirAdicional: cardapio.excluirAdicional,
  salvarSetor: cardapio.salvarSetor,
  excluirSetor: cardapio.excluirSetor,
  // mesas
  listarComandasAtivas: mesas.listarComandasAtivas,
  listarMesas: mesas.listarMesas,
  entrarPorQr: mesas.entrarPorQr,
  abrirComanda: mesas.abrirComanda,
  listarCartoes: mesas.listarCartoes,
  listarCartoesImpressao: mesas.listarCartoesImpressao,
  entrarPorCartao: mesas.entrarPorCartao,
  adicionarCartoes: mesas.adicionarCartoes,
  removerCartao: mesas.removerCartao,
  salvarMesa: mesas.salvarMesa,
  excluirMesa: mesas.excluirMesa,
  // comandas
  getComanda: comandas.getComanda,
  listarComandas: comandas.listarComandas,
  historicoComandas: comandas.historicoComandas,
  chamarGarcom: comandas.chamarGarcom,
  atenderChamado: comandas.atenderChamado,
  pedirConta: comandas.pedirConta,
  reabrirComanda: comandas.reabrirComanda,
  ajustarComanda: comandas.ajustarComanda,
  cancelarComanda: comandas.cancelarComanda,
  atualizarCliente: comandas.atualizarCliente,
  identificarCliente: comandas.identificarCliente,
  // pedidos
  criarPedido: pedidos.criarPedido,
  listarTickets: pedidos.listarTickets,
  avancarTicket: pedidos.avancarTicket,
  voltarTicket: pedidos.voltarTicket,
  marcarEntregue: pedidos.marcarEntregue,
  cancelarItem: pedidos.cancelarItem,
  notificacoesGarcom: pedidos.notificacoesGarcom,
  // caixa
  getCaixaAberto: caixa.getCaixaAberto,
  abrirCaixa: caixa.abrirCaixa,
  registrarPagamento: caixa.registrarPagamento,
  estornarPagamento: caixa.estornarPagamento,
  resumoCaixa: caixa.resumoCaixa,
  fecharCaixa: caixa.fecharCaixa,
  buscarProdutoBalcao: balcao.buscarProdutoBalcao,
  listarProdutosBalcao: balcao.listarProdutosBalcao,
  registrarVendaBalcao: balcao.registrarVendaBalcao,
  listarVendasBalcao: balcao.listarVendasBalcao,
  emitirNfce: balcao.emitirNfce,
  listarEstoque: balcao.listarEstoque,
  listarMovimentosEstoque: balcao.listarMovimentosEstoque,
  movimentarEstoque: balcao.movimentarEstoque,
  // relatórios
  getResumoDashboard: relatorios.getResumoDashboard,
  // assinatura do negócio
  getAssinatura: acesso.getAssinatura,
  // painel do admin
  getPrimeirosPassos: acesso.getPrimeirosPassos,
};

/** com a assinatura vencida/suspensa, só isto funciona (entrar e ver como regularizar) */
export const LIBERADAS_SEM_ASSINATURA = new Set(["login", "entrarComToken", "logout", "sessaoAtual", "getEstabelecimento", "getAssinatura"]);

/** operações do domínio principal (site do produto + painel da plataforma) */
export const REGISTRO_PLATAFORMA: Record<string, H> = {
  verificarSlug: plataforma.verificarSlug,
  cadastrarNegocio: plataforma.cadastrarNegocio,
  acessarConta: plataforma.acessarConta,
  plataformaEntrar: plataforma.plataformaEntrar,
  plataformaSair: plataforma.plataformaSair,
  plataformaSessao: plataforma.plataformaSessao,
  plataformaListar: plataforma.plataformaListar,
  plataformaAtualizar: plataforma.plataformaAtualizar,
};
