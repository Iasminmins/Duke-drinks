"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/stores/session";
import type { Papel } from "@/types";

/** protege rotas da equipe por papel (admin sempre tem acesso) */
export function RoleGuard({ papeis, children }: { papeis: Papel[]; children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { usuario, expiraEm, sair } = useSession();
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    if (useSession.persist.hasHydrated()) setHidratado(true);
    return useSession.persist.onFinishHydration(() => setHidratado(true));
  }, []);

  const expirou = !!expiraEm && Date.now() > expiraEm;
  const permitido = !!usuario && !expirou && (usuario.papel === "admin" || papeis.includes(usuario.papel));

  useEffect(() => {
    if (!hidratado) return;
    if (!usuario) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (expirou) {
      sair();
      router.replace(`/sessao-expirada?next=${encodeURIComponent(path)}`);
    } else if (!permitido) router.replace("/403");
  }, [hidratado, usuario, expirou, permitido, path, router, sair]);

  if (!hidratado || !permitido) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }
  return <>{children}</>;
}
