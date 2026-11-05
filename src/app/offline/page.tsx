import { WifiOff } from "lucide-react";

export const metadata = { title: "Sem conexão" };

export default function Offline() {
  return (
    <main className="bg-pub flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-warn-soft text-warn">
        <WifiOff className="h-10 w-10" />
      </div>
      <h1 className="mt-6 font-display text-4xl">Sem conexão</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">Verifique o Wi-Fi do salão. A tela volta sozinha quando a internet voltar.</p>
    </main>
  );
}
