"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { entrarComToken } from "@/services/plataforma.service";
import { useSession } from "@/stores/session";
import { mensagemErro } from "@/lib/errors";

/**
 * Para onde o dono vai logo depois do cadastro: /entrar?t=<link curto>.
 * Troca o link por uma sessão normal e abre o painel com os primeiros passos.
 */
function Entrar() {
  const params = useSearchParams();
  const router = useRouter();
  const entrar = useSession((s) => s.entrar);
  const [erro, setErro] = useState<string | null>(null);
  const feito = useRef(false);

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    const t = params.get("t");
    if (!t) {
      const empresa = params.get("empresa");
      router.replace(`/login?${empresa ? `empresa=${encodeURIComponent(empresa)}&` : ""}next=/admin`);
      return;
    }
    entrarComToken(t)
      .then((u) => {
        entrar(u);
        const empresa = params.get("empresa");
        if (empresa) localStorage.setItem("empresa", empresa);
        // "novo=1" vem só do cadastro: mostra as boas-vindas; no login de todo dia, painel normal
        router.replace(params.get("novo") ? "/admin?bemvindo=1" : "/admin");
      })
      .catch((e) => setErro(mensagemErro(e)));
  }, [params, router, entrar]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      {erro ? (
        <div className="max-w-sm">
          <p className="font-display text-4xl">Não deu para entrar direto</p>
          <p className="mt-3 text-muted">{erro}</p>
          <Link
            href={`/login?${params.get("empresa") ? `empresa=${encodeURIComponent(params.get("empresa")!)}&` : ""}next=/admin`}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-[10px] bg-gold px-6 font-semibold text-bg hover:bg-gold-600"
          >
            Entrar com usuário e senha
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-7 w-7 animate-spin text-gold" />
          Abrindo o seu sistema…
        </div>
      )}
    </main>
  );
}

export default function EntrarPage() {
  return (
    <Suspense>
      <Entrar />
    </Suspense>
  );
}
