import "server-only";
import type { Ctx } from "./comum";
import * as acesso from "./handlers/acesso";
import * as cardapio from "./handlers/cardapio";
import * as mesas from "./handlers/mesas";
import * as comandas from "./handlers/comandas";
import * as pedidos from "./handlers/pedidos";
import * as caixa from "./handlers/caixa";
import * as relatorios from "./handlers/relatorios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type H = (ctx: Ctx, ...args: any[]) => Promise<unknown>;

/**
 * Só o que está aqui pode ser chamado pelo navegador (POST /api/rpc/<nome>).
 * A autorização (papel da equipe ou código da comanda) é conferida dentro de cada função.
 */
export const REGISTRO: Record<string, H> = {
  // acesso
  login: acesso.login,
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
  alternarEsgotado: cardapio.alternarEsgotado,
  excluirProduto: cardapio.excluirProduto,
  salvarCategoria: cardapio.salvarCategoria,
  excluirCategoria: cardapio.excluirCategoria,
  salvarAdicional: cardapio.salvarAdicional,
  excluirAdicional: cardapio.excluirAdicional,
  salvarSetor: cardapio.salvarSetor,
  excluirSetor: cardapio.excluirSetor,
  // mesas
  listarMesasComStatus: mesas.listarMesasComStatus,
  listarMesas: mesas.listarMesas,
  getMesaPublica: mesas.getMesaPublica,
  entrarNaComanda: mesas.entrarNaComanda,
  abrirComanda: mesas.abrirComanda,
  salvarMesa: mesas.salvarMesa,
  excluirMesa: mesas.excluirMesa,
  // comandas
  getComanda: comandas.getComanda,
  listarComandas: comandas.listarComandas,
  historicoComandas: comandas.historicoComandas,
  validarCodigo: comandas.validarCodigo,
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
  // relatórios
  getResumoDashboard: relatorios.getResumoDashboard,
};
