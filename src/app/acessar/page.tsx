"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { mensagemErro } from "@/lib/errors";
import { acessarConta, type ContaAcesso } from "@/services/plataforma.service";
import { FontesComandou, MarcaComandou, SITE_COMANDOU } from "@/components/brand/comandou";

/**
 * Login único do Comandou (domínio principal): o dono entra com e-mail e senha,
 * sem precisar saber o endereço do negócio. Com um negócio só, vai direto para o painel.
 */
export default function AcessarPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [contas, setContas] = useState<ContaAcesso[] | null>(null);

  const m = useMutation({
    mutationFn: () => acessarConta(email, senha),
    onSuccess: (lista) => {
      if (lista.length === 1) window.location.href = lista[0].url;
      else setContas(lista);
    },
    onError: (e) => setErro(mensagemErro(e)),
  });

  const pronto = /\S+@\S+\.\S+/.test(email) && senha.length > 0;

  return (
    <main className="tema-comandou min-h-dvh px-4 py-8 sm:py-12">
      <FontesComandou />
      <div className="mx-auto max-w-md">
        <MarcaComandou />

        {contas ? (
          <>
            <h1 className="mt-12 font-display text-[2.6rem] leading-[0.98]">Qual negócio?</h1>
            <p className="mt-3 text-muted">Seu e-mail está em mais de um negócio. Escolha qual abrir.</p>
            <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border-2 border-cream">
              {contas.map((c) => (
                <li key={c.slug}>
                  <a href={c.url} className="flex items-center gap-3 px-5 py-4 hover:bg-surface">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{c.nome}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-subtle" />
                  </a>
                </li>
              ))}
            </ul>
            <button onClick={() => setContas(null)} className="mt-5 text-sm text-muted underline">
              Usar outro e-mail
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-12 font-display text-[2.6rem] leading-[0.98] sm:text-5xl">Entrar</h1>
            <p className="mt-3 text-muted">Use o e-mail e a senha que você cadastrou.</p>

            <form
              className="mt-8 space-y-4 rounded-2xl border-2 border-cream p-6"
              onSubmit={(e) => {
                e.preventDefault();
                setErro(null);
                if (pronto && !m.isPending) m.mutate();
              }}
            >
              <Field label="E-mail" htmlFor="a-email">
                <Input
                  id="a-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Senha" htmlFor="a-senha">
                <div className="relative">
                  <Input
                    id="a-senha"
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
              {erro && (
                <p role="alert" className="text-sm text-red">
                  {erro}
                </p>
              )}
              <Button type="submit" size="lg" block loading={m.isPending || m.isSuccess} disabled={!pronto}>
                Entrar
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-sm text-muted">
              <p>
                É da equipe (garçom, cozinha ou caixa)? <a href="/login" className="font-semibold underline">Entre com o código da sua empresa.</a>
              </p>
              <p>
                Ainda não tem conta?{" "}
                <a href="/cadastro" className="font-semibold text-gold underline">
                  Teste 14 dias grátis
                </a>
              </p>
              <p>
                <a href={SITE_COMANDOU} className="underline">
                  Voltar ao site
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
