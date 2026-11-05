import type { Comanda, Mesa, MesaComStatus } from "@/types";
import { rpc } from "./_rpc";

export function listarMesasComStatus(): Promise<MesaComStatus[]> {
  return rpc("listarMesasComStatus");
}

export function listarMesas(): Promise<Mesa[]> {
  return rpc("listarMesas");
}

/** usado pela tela do cliente: só dados públicos da mesa */
export function getMesaPublica(numero: number): Promise<{ mesa: Mesa; comandasAbertas: number }> {
  return rpc("getMesaPublica", numero);
}

export interface ComandaPublica {
  id: string;
  clienteNome?: string;
  clienteCelular?: string;
}

/** cliente digita o código de 4 dígitos e entra na SUA comanda (a mesa pode ter várias) */
export function entrarNaComanda(mesaNumero: number, codigo: string): Promise<ComandaPublica> {
  return rpc("entrarNaComanda", mesaNumero, codigo);
}

/** garçom abre a comanda (nome e celular obrigatórios); o usuário vem da sessão no servidor */
export function abrirComanda(
  mesaId: string,
  _usuarioId: string,
  cliente: { nome: string; celular: string },
): Promise<Comanda> {
  void _usuarioId;
  return rpc("abrirComanda", mesaId, null, cliente);
}

export function salvarMesa(dados: Omit<Mesa, "id"> & { id?: string }): Promise<Mesa> {
  return rpc("salvarMesa", dados);
}

export function excluirMesa(id: string): Promise<void> {
  return rpc("excluirMesa", id);
}
