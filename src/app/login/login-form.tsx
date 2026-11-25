"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useDominioPlataforma, useMarca } from "@/components/brand/marca";
import { MarcaComandou } from "@/components/brand/comandou";
import { PRODUTO } from "@/lib/planos";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { login, loginEmpresa } from "@/services/auth.service";
import { useSession } from "@/stores/session";
import { PAPEL_HOME } from "@/lib/labels";
import { mensagemErro } from "@/lib/errors";

export function LoginForm() {
  const router = useRouter();
  const marca = useMarca();
  const plataforma = useDominioPlataforma();
  const params = useSearchParams();
  const entrar = useSession((s) => s.entrar);
  const [empresa, setEmpresa] = useState(() => params.get("empresa") ?? "");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);

  useEffect(() => {
    if (!plataforma || empresa || typeof window === "undefined") return;
    setEmpresa(localStorage.getItem("empresa") ?? "");
  }, [plataforma, empresa]);

  const m = useMutation({
    mutationFn: () => plataforma ? loginEmpresa(empresa, usuario, senha) : login(usuario, senha),
    onSuccess: (u) => {
      if (plataforma && typeof window !== "undefined") localStorage.setItem("empresa", empresa.trim().toLowerCase());
      entrar(u);
      toast.success(`Bem-vindo(a), ${u.nome.split(" ")[0]}!`);
      const next = params.get("next");
      // só volta para a tela pedida se o papel tem acesso a ela; senão vai para a tela do próprio papel
      const casa = PAPEL_HOME[u.papel];
      const seguro = !!next && next.startsWith("/") && !next.startsWith("//");
      const permitido = seguro && (u.papel === "admin" || next === casa || next.startsWith(casa + "/"));
      router.replace(permitido ? next! : casa);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const pronto = (!plataforma || empresa.trim().length > 0) && usuario.trim().length > 0 && senha.length > 0;

  return (
    <main className="bg-pub flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          {plataforma ? <MarcaComandou /> : <Logo />}
        </div>
        <form
          className="mt-8 rounded-2xl border border-line bg-bg-soft/90 p-6 shadow-2xl backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            if (pronto && !m.isPending) m.mutate();
          }}
        >
          <h1 className="font-display text-3xl">Acesso da equipe</h1>
          <p className="mt-1 text-sm text-muted">Entre com seu usuário e senha.</p>

          <div className="mt-6 space-y-4">
            {plataforma && <Field label="Código da empresa" htmlFor="login-empresa">
              <Input id="login-empresa" autoComplete="organization" autoCapitalize="none" autoFocus value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="ex.: duke" />
            </Field>}
            <Field label="Usuário" htmlFor="login-usuario">
              <Input
                id="login-usuario"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus={!plataforma}
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="seu usuário"
              />
            </Field>
            <Field label="Senha" htmlFor="login-senha">
              <div className="relative">
                <Input
                  id="login-senha"
                  type={ver ? "text" : "password"}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-subtle hover:text-cream"
                >
                  {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>

          <Button type="submit" size="lg" block className="mt-6" loading={m.isPending} disabled={!pronto}>
            Entrar
          </Button>

          <p className="mt-6 text-center text-xs text-subtle">
            {plataforma ? "Esqueceu a senha? Peça ao administrador da sua empresa para redefinir em Admin → Usuários." : <>Esqueceu a senha? Peça para o administrador do {marca?.nome ?? "estabelecimento"} redefinir em Admin → Usuários.</>}
          </p>
        </form>
        <p className="mt-6 text-center text-xs text-subtle">
          {plataforma ? "Acesso da equipe aos negócios cadastrados no Comandou." : [marca?.nome, marca?.endereco].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 text-center text-[11px] text-subtle/70">{PRODUTO.nome}</p>
      </div>
    </main>
  );
}
