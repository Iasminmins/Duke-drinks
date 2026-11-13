"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { RoleGuard } from "@/components/layout/role-guard";
import { ComandaQR } from "@/components/comanda-qr";
import { Coroa } from "@/components/brand/coroa";
import { useMarca } from "@/components/brand/marca";
import { EmptyState } from "@/components/ui/empty-state";
import { listarComandasAtivas } from "@/services/mesas.service";

/** Cartão da comanda para imprimir: número grande + QR que abre o cardápio e os pedidos. */
export default function ImprimirComanda() {
  const { numero } = useParams<{ numero: string }>();
  const q = useQuery({ queryKey: ["comandas-ativas"], queryFn: listarComandasAtivas });
  const c = q.data?.find((x) => x.numero === Number(numero));
  const marca = useMarca();

  return (
    <RoleGuard papeis={["garcom", "caixa"]}>
      <style>{`@page { size: 80mm auto; margin: 4mm; } @media print { .cartao { background: #fff !important; } }`}</style>
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg-soft px-6 py-3">
        <p className="flex-1 text-sm text-muted">Cartão da comanda {numero}</p>
        <button onClick={() => window.print()} disabled={!c} className="flex h-11 items-center gap-2 rounded-[10px] bg-gold px-4 text-sm font-semibold text-bg disabled:opacity-50">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>
      {q.isSuccess && !c && <EmptyState titulo="Comanda não encontrada" descricao="Ela pode já ter sido paga ou cancelada." />}
      {c && (
        <div className="cartao mx-auto my-6 flex w-[72mm] flex-col items-center gap-[3mm] rounded-[4mm] border-2 border-gold bg-[#0f0f10] p-[5mm] text-center print:my-0">
          <div className="flex flex-col items-center leading-none">
            <Coroa className="h-[4mm] w-[6mm] text-gold" />
            <span className="max-w-[60mm] truncate font-display text-[9mm] uppercase text-[#f5ecd7]">
              {(marca?.nome ?? "").split(/\s*[|·–-]\s*/)[0]}
            </span>
          </div>
          <p className="font-display text-[14mm] leading-none text-gold">{c.numero}</p>
          {c.clienteNome && <p className="text-[4mm] text-[#f5ecd7]">{c.clienteNome}</p>}
          <div className="rounded-[2mm] bg-white p-[2mm]">
            <ComandaQR token={c.token} numero={c.numero} tamanho={170} claro />
          </div>
          <p className="text-[3mm] text-[#f5ecd7]">Aponte a câmera para ver o cardápio e pedir.</p>
          <p className="text-[2.6mm] text-[#f5ecd7]/70">Guarde este cartão: ele é a sua comanda.</p>
        </div>
      )}
    </RoleGuard>
  );
}
