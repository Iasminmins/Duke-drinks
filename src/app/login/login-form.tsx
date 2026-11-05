"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { login } from "@/services/auth.service";
import { useSession } from "@/stores/session";
import { PAPEL_HOME } from "@/lib/labels";
import { mensagemErro } from "@/lib/errors";

/** acessos de demonstração (clique para preencher) */
const ACESSOS_DEMO = [
  { login: "admin", papel: "Administrador" },
  { login: "rafael", papel: "Garçom" },
  { login: "marcos", papel: "Cozinha" },
  { login: "leo", papel: "Bar" },
  { login: "juliana", papel: "Caixa" },
];
const SENHA_DEMO = "duke123";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const entrar = useSession((s) => s.entrar);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);

  const m = useMutation({
    mutationFn: () => login(usuario, senha),
    onSuccess: (u) => {
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

  const pronto = usuario.trim().length > 0 && senha.length > 0;

  return (
    <main className="bg-pub flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
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
            <Field label="Usuário" htmlFor="login-usuario">
              <Input
                id="login-usuario"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ex.: rafael"
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

          <div className="mt-6 rounded-xl border border-line bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Acessos de demonstração</p>
            <p className="mt-1 text-xs text-muted">
              Senha de todos: <b className="text-cream">{SENHA_DEMO}</b>. Toque em um usuário para preencher.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACESSOS_DEMO.map((a) => (
                <button
                  key={a.login}
                  type="button"
                  onClick={() => {
                    setUsuario(a.login);
                    setSenha(SENHA_DEMO);
                  }}
                  className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-left text-xs hover:border-gold/50"
                >
                  <span className="block font-semibold text-cream">{a.login}</span>
                  <span className="block text-subtle">{a.papel}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
        <p className="mt-6 text-center text-xs text-subtle">Duke Drinks e Choperia · Shopping Belvedere</p>
      </div>
    </main>
  );
}
