import Link from "next/link";
import { Clock } from "lucide-react";

export const metadata = { title: "Sessão expirada" };

export default async function SessaoExpirada({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="bg-pub flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-gold-soft text-gold">
        <Clock className="h-10 w-10" />
      </div>
      <h1 className="mt-6 font-display text-4xl">Sessão expirada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">Por segurança, o acesso da equipe expira ao fim do expediente. Entre de novo para continuar.</p>
      <Link
        href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        className="mt-6 rounded-[10px] bg-gold px-6 py-3 text-sm font-semibold text-bg"
      >
        Entrar novamente
      </Link>
    </main>
  );
}
