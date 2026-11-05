"use client";

import Link from "next/link";
import { useSession } from "@/stores/session";
import { PAPEL_HOME, PAPEL_LABEL } from "@/lib/labels";
import { Mascote } from "@/components/brand/mascote";

export default function SemPermissao() {
  const usuario = useSession((s) => s.usuario);
  return (
    <main className="bg-pub flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Mascote className="h-24 w-24" />
      <p className="mt-6 font-display text-7xl leading-none text-red">403</p>
      <h1 className="mt-2 font-display text-3xl">Área restrita</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {usuario ? `Seu acesso de ${PAPEL_LABEL[usuario.papel]} não inclui esta tela.` : "Você precisa entrar para ver esta tela."}
      </p>
      <div className="mt-6 flex gap-2">
        {usuario && (
          <Link href={PAPEL_HOME[usuario.papel]} className="rounded-[10px] bg-gold px-5 py-3 text-sm font-semibold text-bg">
            Ir para minha tela
          </Link>
        )}
        <Link href="/login" className="rounded-[10px] border border-line px-5 py-3 text-sm">
          Trocar de usuário
        </Link>
      </div>
    </main>
  );
}
