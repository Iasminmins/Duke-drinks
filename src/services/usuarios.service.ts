import type { Usuario } from "@/types";
import { rpc } from "./_rpc";

export function listarUsuarios(): Promise<Usuario[]> {
  return rpc("listarUsuarios");
}

/** senha em branco ao editar = mantém a senha atual */
export function salvarUsuario(dados: Omit<Usuario, "id"> & { id?: string }): Promise<Usuario> {
  return rpc("salvarUsuario", dados);
}

export function alternarUsuarioAtivo(id: string): Promise<Usuario> {
  return rpc("alternarUsuarioAtivo", id);
}
