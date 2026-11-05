"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/stores/session";
import { PAPEL_LABEL } from "@/lib/labels";
import { formatDataHora } from "@/lib/format";

export default function PerfilPage() {
  const router = useRouter();
  const { usuario, expiraEm, sair } = useSession();
  if (!usuario) return null;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Perfil</h1>
      <Card className="flex items-center gap-4 p-5">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-red font-display text-3xl">{usuario.nome[0]}</span>
        <div>
          <p className="text-lg font-semibold">{usuario.nome}</p>
          <p className="text-sm text-muted">{PAPEL_LABEL[usuario.papel]}</p>
          {expiraEm && <p className="mt-1 text-xs text-subtle">Sessão válida até {formatDataHora(new Date(expiraEm).toISOString())}</p>}
        </div>
      </Card>
      <Button
        variant="danger"
        size="lg"
        block
        onClick={() => {
          sair();
          router.replace("/login");
        }}
      >
        <LogOut className="h-5 w-5" /> Sair
      </Button>
    </div>
  );
}
