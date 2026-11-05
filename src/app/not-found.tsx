import Link from "next/link";
import { Mascote } from "@/components/brand/mascote";

export default function NotFound() {
  return (
    <main className="bg-pub flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Mascote className="h-24 w-24" />
      <p className="mt-6 font-display text-7xl leading-none text-gold">404</p>
      <h1 className="mt-2 font-display text-3xl">Esse copo está vazio</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">A página que você procurou não existe ou mudou de lugar.</p>
      <Link href="/" className="mt-6 rounded-[10px] bg-gold px-6 py-3 text-sm font-semibold text-bg">
        Voltar ao início
      </Link>
    </main>
  );
}
