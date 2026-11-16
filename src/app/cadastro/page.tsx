"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { dominioApp } from "@/lib/host";
import { mascaraCelular } from "@/lib/format";
import { mensagemErro } from "@/lib/errors";
import { PRODUTO, TIPOS_NEGOCIO, type TipoNegocio } from "@/lib/planos";
import { cadastrarNegocio, verificarSlug } from "@/services/plataforma.service";
import { FontesComandou as Fontes, MarcaComandou, SITE_COMANDOU as SITE } from "@/components/brand/comandou";

function sugerirSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export default function CadastroPage() {
  const [f, setF] = useState({
    nomeNegocio: "",
    tipo: "bar" as TipoNegocio,
    slug: "",
    responsavelNome: "",
    email: "",
    celular: "",
    login: "admin",
    senha: "",
  });
  const [aceite, setAceite] = useState(false);
  const [slugEditado, setSlugEditado] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ ok: boolean; msg?: string } | null>(null);
  const [checando, setChecando] = useState(false);
  const [pronto, setPronto] = useState<{ url: string; entrada: string } | null>(null);
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }));

  // endereço sugerido a partir do nome, até a pessoa mexer nele
  useEffect(() => {
    if (!slugEditado) set({ slug: sugerirSlug(f.nomeNegocio) });
  }, [f.nomeNegocio, slugEditado]);

  // confere se o endereço está livre (com uma pequena espera enquanto digita)
  useEffect(() => {
    if (f.slug.length < 3) {
      setSlugStatus(null);
      return;
    }
    setChecando(true);
    const t = setTimeout(async () => {
      try {
        const r = await verificarSlug(f.slug);
        setSlugStatus({ ok: r.disponivel, msg: r.motivo });
      } catch {
        setSlugStatus(null);
      } finally {
        setChecando(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [f.slug]);

  const m = useMutation({
    mutationFn: () => cadastrarNegocio({ ...f, celular: f.celular.replace(/\D/g, "") }),
    onSuccess: (r) => setPronto({ url: r.url, entrada: r.entrada }),
    onError: (e) => toast.error(mensagemErro(e)),
  });

  if (pronto) {
    return (
      <main className="tema-comandou grid min-h-dvh place-items-center px-4">
        <Fontes />
        <div className="w-full max-w-md rounded-2xl border-2 border-cream p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-ok" />
          <h1 className="mt-4 font-display text-4xl leading-none">Tudo pronto!</h1>
          <p className="mt-3 text-muted">
            O sistema do <b className="text-cream">{f.nomeNegocio}</b> já está no ar.
          </p>
          <a
            href={`${pronto.url}/entrar?novo=1&t=${encodeURIComponent(pronto.entrada)}`}
            className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-[12px] bg-gold text-base font-bold text-bg hover:bg-gold-600"
          >
            Entrar no meu sistema
          </a>
          <p className="mt-3 text-xs text-subtle">
            Da próxima vez, é só clicar em <b>Entrar</b> no site e usar seu e-mail e senha.
          </p>
        </div>
      </main>
    );
  }

  const valido =
    f.nomeNegocio.trim().length >= 2 &&
    !!slugStatus?.ok &&
    f.responsavelNome.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(f.email) &&
    f.celular.replace(/\D/g, "").length >= 10 &&
    /^[A-Za-z0-9._-]{3,}$/.test(f.login) &&
    f.senha.length >= 8 &&
    aceite;

  return (
    <main className="tema-comandou min-h-dvh px-4 py-8 sm:py-12">
      <Fontes />
      <div className="mx-auto max-w-xl">
        <MarcaComandou />
        <h1 className="mt-10 font-display text-[2.6rem] leading-[0.98] sm:text-5xl">Crie o sistema do seu negócio</h1>
        <p className="mt-4 text-lg text-muted">
          {PRODUTO.diasTeste} dias grátis com tudo liberado. Leva 2 minutos e você já sai com o sistema funcionando.
        </p>

        <form
          className="mt-8 space-y-5 rounded-2xl border-2 border-cream p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (valido && !m.isPending) m.mutate();
          }}
        >
          <p className="text-lg font-bold">Seu negócio</p>
          <Field label="Nome do negócio" htmlFor="c-nome">
            <Input id="c-nome" value={f.nomeNegocio} onChange={(e) => set({ nomeNegocio: e.target.value })} placeholder="ex.: Burger do Zé" autoFocus />
          </Field>
          <Field label="Tipo" htmlFor="c-tipo" dica="Usamos para criar as categorias e os setores de produção. Dá para mudar tudo depois.">
            <Select id="c-tipo" value={f.tipo} onChange={(e) => set({ tipo: e.target.value as TipoNegocio })}>
              {TIPOS_NEGOCIO.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Endereço do seu sistema" htmlFor="c-slug">
            <div className="flex items-center overflow-hidden rounded-[10px] border border-line focus-within:border-gold">
              <input
                id="c-slug"
                value={f.slug}
                onChange={(e) => {
                  setSlugEditado(true);
                  set({ slug: sugerirSlug(e.target.value) });
                }}
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-cream focus:outline-none"
                placeholder="burger-do-ze"
              />
              <span className="shrink-0 pr-3 text-sm text-subtle">.{dominioApp()}</span>
            </div>
            <p className="mt-1.5 flex min-h-4 items-center gap-1.5 text-xs">
              {checando ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin text-subtle" /> <span className="text-subtle">conferindo…</span></>
              ) : slugStatus?.ok ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-ok" /> <span className="text-ok">disponível</span></>
              ) : slugStatus ? (
                <><XCircle className="h-3.5 w-3.5 text-red" /> <span className="text-red">{slugStatus.msg}</span></>
              ) : null}
            </p>
          </Field>

          <p className="pt-3 text-lg font-bold">Você</p>
          <Field label="Seu nome" htmlFor="c-resp">
            <Input id="c-resp" value={f.responsavelNome} onChange={(e) => set({ responsavelNome: e.target.value })} autoComplete="name" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="E-mail" htmlFor="c-email">
              <Input id="c-email" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />
            </Field>
            <Field label="Celular (WhatsApp)" htmlFor="c-cel">
              <Input id="c-cel" inputMode="tel" value={f.celular} onChange={(e) => set({ celular: mascaraCelular(e.target.value) })} placeholder="(24) 99999-8888" />
            </Field>
          </div>

          <p className="pt-3 text-lg font-bold">Seu acesso de administrador</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Usuário" htmlFor="c-login">
              <Input id="c-login" value={f.login} onChange={(e) => set({ login: e.target.value.trim() })} autoComplete="username" autoCapitalize="none" />
            </Field>
            <Field label="Senha" htmlFor="c-senha" dica="Mínimo de 8 caracteres">
              <Input id="c-senha" type="password" value={f.senha} onChange={(e) => set({ senha: e.target.value })} autoComplete="new-password" />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 pt-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#2340d9]"
            />
            <span>
              Li e aceito os{" "}
              <a href={`${SITE}/termos.html`} target="_blank" rel="noopener" className="font-semibold text-gold underline">
                termos de uso
              </a>{" "}
              e a{" "}
              <a href={`${SITE}/privacidade.html`} target="_blank" rel="noopener" className="font-semibold text-gold underline">
                política de privacidade
              </a>
              .
            </span>
          </label>

          <Button type="submit" size="lg" block loading={m.isPending} disabled={!valido}>
            Criar meu sistema
          </Button>
          <p className="text-center text-xs text-subtle">Sem cartão de crédito. Nada é cobrado durante o teste.</p>
        </form>
      </div>
    </main>
  );
}
