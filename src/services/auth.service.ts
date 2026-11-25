import type { Usuario } from "@/types";
import { rpc } from "./_rpc";

/** Login por usuário + senha. O servidor confere a senha e abre a sessão (cookie seguro, 12h). */
export function login(usuario: string, senha: string): Promise<Usuario> {
  return rpc("login", usuario, senha);
}

/** Entrada no domínio principal: identifica o negócio pelo código antes de validar o usuário da equipe. */
export function loginEmpresa(empresa: string, usuario: string, senha: string): Promise<Usuario> {
  return rpc("loginEmpresa", empresa, usuario, senha);
}

export function logout(): Promise<void> {
  return rpc("logout");
}
