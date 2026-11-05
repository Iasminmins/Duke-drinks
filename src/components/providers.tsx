"use client";

import { useState, type ReactNode } from "react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useRealtimeSync } from "@/hooks/useRealtime";

function RealtimeBridge() {
  useRealtimeSync();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const qc: QueryClient = new QueryClient({
      // qualquer ação concluída (pedido, pagamento, cancelamento...) atualiza as telas na hora
      mutationCache: new MutationCache({ onSuccess: () => void qc.invalidateQueries() }),
      defaultOptions: {
        queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 1 },
        mutations: { retry: 0 },
      },
    });
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <RealtimeBridge />
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        closeButton
        toastOptions={{ style: { background: "#232326", border: "1px solid #36363b", color: "#f5ecd7" } }}
      />
    </QueryClientProvider>
  );
}
