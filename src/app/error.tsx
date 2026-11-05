"use client";

import { ErrorState } from "@/components/ui/empty-state";

export default function Erro({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <ErrorState mensagem={error.message} onRetry={reset} />
    </main>
  );
}
