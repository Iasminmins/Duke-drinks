"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CrudSimples } from "@/components/admin/crud-simples";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { alternarUsuarioAtivo, listarUsuarios, salvarUsuario } from "@/services/usuarios.service";
import { PAPEL_LABEL } from "@/lib/labels";
import { mensagemErro } from "@/lib/errors";
import type { Papel, Usuario } from "@/types";

type F = Omit<Usuario, "id"> & { id?: string };
const PAPEIS = Object.keys(PAPEL_LABEL) as Papel[];

export default function UsuariosPage() {
  const q = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });
  const toggle = useMutation({ mutationFn: alternarUsuarioAtivo, onError: (e) => toast.error(mensagemErro(e)) });

  return (
    <CrudSimples<Usuario, F>
      descricao="Cada papel enxerga só as telas do seu trabalho. O admin acessa tudo."
      itens={q.data}
      carregando={q.isLoading}
      nomeItem="Usuário"
      rotulo={(u) => u.nome}
      colunas={[
        {
          titulo: "Nome",
          render: (u) => (
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-red text-xs font-bold">{u.nome[0]}</span>
              <span className="font-medium">{u.nome}</span>
            </span>
          ),
        },
        { titulo: "Login", render: (u) => <span className="font-mono text-sm text-muted">{u.login}</span> },
        { titulo: "Papel", render: (u) => <Badge tom={u.papel === "admin" ? "gold" : "neutral"}>{PAPEL_LABEL[u.papel]}</Badge> },
        {
          titulo: "Ativo",
          render: (u) => <Switch checked={u.ativo} onChange={() => toggle.mutate(u.id)} label={`Ativo: ${u.nome}`} />,
        },
      ]}
      novo={() => ({ nome: "", login: "", senha: "", papel: "garcom", ativo: true })}
      paraForm={(u) => ({ ...u, senha: "" })}
      validar={(f) => {
        if (f.nome.trim().length < 2) return "Informe o nome";
        if (!/^[a-z0-9._-]{3,}$/i.test(f.login.trim())) return "Login: mínimo 3 caracteres, sem espaços";
        if (!f.id && (f.senha ?? "").length < 4) return "Defina uma senha com pelo menos 4 caracteres";
        if (f.senha && f.senha.length < 4) return "A senha precisa de pelo menos 4 caracteres";
        return null;
      }}
      salvar={(f) => salvarUsuario({ ...f, nome: f.nome.trim(), login: f.login.trim() })}
      campos={(f, set) => (
        <>
          <Field label="Nome" htmlFor="u-nome">
            <Input id="u-nome" value={f.nome} onChange={(e) => set({ nome: e.target.value })} />
          </Field>
          <Field label="Login (usuário de acesso)" htmlFor="u-login">
            <Input id="u-login" autoCapitalize="none" value={f.login} onChange={(e) => set({ login: e.target.value })} placeholder="ex.: rafael" />
          </Field>
          <Field label={f.id ? "Nova senha (deixe em branco para manter)" : "Senha"} htmlFor="u-senha">
            <Input id="u-senha" type="text" autoComplete="off" value={f.senha ?? ""} onChange={(e) => set({ senha: e.target.value })} />
          </Field>
          <Field label="Papel" htmlFor="u-papel">
            <Select id="u-papel" value={f.papel} onChange={(e) => set({ papel: e.target.value as Papel })}>
              {PAPEIS.map((p) => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
            </Select>
          </Field>
          <p className="text-xs text-subtle">Na demo a senha fica salva só neste navegador. Na versão com back-end ela é protegida e o convite vai por e-mail.</p>
        </>
      )}
    />
  );
}
