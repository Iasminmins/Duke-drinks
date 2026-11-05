"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { RoleGuard } from "@/components/layout/role-guard";
import { MesaQR } from "@/components/admin/mesa-qr";
import { Coroa } from "@/components/brand/coroa";
import { listarMesas } from "@/services/mesas.service";

/** Folha A4 com os QR codes (3 × 4 por página), pronta para imprimir e plastificar. */
export default function ImprimirQR() {
  const q = useQuery({ queryKey: ["mesas"], queryFn: listarMesas });
  const mesas = (q.data ?? []).filter((m) => m.ativa);

  return (
    <RoleGuard papeis={["admin"]}>
      <style>{`@page { size: A4; margin: 10mm; } @media print { .folha { background: #fff !important; } }`}</style>
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg-soft px-6 py-3">
        <p className="flex-1 text-sm text-muted">{mesas.length} QR codes · formato A4, 12 por página</p>
        <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-[10px] bg-gold px-4 text-sm font-semibold text-bg">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>
      <div className="folha mx-auto grid max-w-[190mm] grid-cols-3 gap-[6mm] bg-white p-[6mm] print:p-0">
        {mesas.map((m) => (
          <div
            key={m.id}
            className="flex h-[64mm] break-inside-avoid flex-col items-center justify-between rounded-[4mm] border-2 border-[#c8102e] bg-[#0f0f10] p-[4mm] text-center"
          >
            <div className="flex flex-col items-center leading-none">
              <Coroa className="h-[3mm] w-[5mm] text-[#f5b800]" />
              <span className="font-display text-[7mm] text-[#f5ecd7]">DUKE</span>
            </div>
            <div className="rounded-[2mm] bg-white p-[1.5mm]">
              <MesaQR numero={m.numero} tamanho={110} claro />
            </div>
            <div>
              <p className="font-display text-[6mm] leading-none text-[#f5b800]">MESA {m.numero}</p>
              <p className="mt-[1mm] text-[2.4mm] text-[#f5ecd7]">Aponte a câmera · cardápio e pedidos</p>
            </div>
          </div>
        ))}
      </div>
    </RoleGuard>
  );
}
