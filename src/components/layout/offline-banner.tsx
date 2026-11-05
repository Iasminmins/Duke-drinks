"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-warn px-4 py-2 text-sm font-semibold text-bg">
      <WifiOff className="h-4 w-4" /> Sem conexão. Os pedidos serão enviados quando a internet voltar.
    </div>
  );
}
