"use client";

import { GarcomShell } from "@/components/garcom/garcom-shell";
import { useSession } from "@/stores/session";

export function GarcomLayoutShell({ children }: { children: React.ReactNode }) {
  const usuario = useSession((s) => s.usuario);
  return usuario?.papel === "admin" ? <>{children}</> : <GarcomShell>{children}</GarcomShell>;
}
