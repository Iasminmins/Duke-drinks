"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer } from "lucide-react";
import { RoleGuard } from "@/components/layout/role-guard";
import { useMarca } from "@/components/brand/marca";
import { EmptyState } from "@/components/ui/empty-state";
import { listarCartoesImpressao } from "@/services/mesas.service";

/**
 * Cards de comanda para imprimir em folha A4 (9 por folha, com linha de corte).
 * Cada card tem o número e o QR fixo do cartão: ele nunca muda, então dá para imprimir uma vez e plastificar.
 */
export default function ImprimirCartoes() {
  const q = useQuery({ queryKey: ["cartoes-impressao"], queryFn: listarCartoesImpressao });
  const marca = useMarca();
  const [origem, setOrigem] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  useEffect(() => setOrigem(window.location.origin), []);

  const todos = q.data ?? [];
  const cards = useMemo(
    () => todos.filter((c) => (!de || c.numero >= Number(de)) && (!ate || c.numero <= Number(ate))),
    [todos, de, ate],
  );
  const nome = (marca?.nome ?? "").split(/\s*[|·–-]\s*/)[0];
  const folhas = Math.ceil(cards.length / 9);

  return (
    <RoleGuard papeis={["admin"]}>
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          html, body { background: #fff !important; }
          .folha-cards { gap: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 border-b border-line bg-bg-soft px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <Link href="/admin/comandas" className="flex items-center gap-1.5 text-sm text-muted hover:text-cream">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <p className="flex-1 text-sm text-muted">
            {cards.length} cards{folhas ? ` · ${folhas} ${folhas === 1 ? "folha" : "folhas"} A4` : ""}
          </p>
          <label className="flex items-center gap-2 text-sm text-muted">
            De
            <input
              inputMode="numeric"
              value={de}
              onChange={(e) => setDe(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={todos[0] ? String(todos[0].numero) : ""}
              className="h-10 w-20 rounded-[10px] border border-line bg-bg px-2 text-cream focus:border-gold focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            até
            <input
              inputMode="numeric"
              value={ate}
              onChange={(e) => setAte(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={todos.length ? String(todos[todos.length - 1].numero) : ""}
              className="h-10 w-20 rounded-[10px] border border-line bg-bg px-2 text-cream focus:border-gold focus:outline-none"
            />
          </label>
          <button
            onClick={() => window.print()}
            disabled={!cards.length || !origem}
            className="flex h-11 items-center gap-2 rounded-[10px] bg-gold px-4 text-sm font-semibold text-bg disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-5xl text-xs text-subtle">
          Dica: imprima em papel mais grosso (180 g ou mais) e plastifique. O QR de cada card é fixo e não muda.
        </p>
      </div>

      {q.isSuccess && todos.length === 0 && (
        <EmptyState titulo="Nenhuma comanda cadastrada" descricao="Cadastre os números em Admin → Comandas e volte aqui para imprimir." />
      )}

      <div className="folha-cards mx-auto grid w-[194mm] grid-cols-3 gap-[3mm] py-6 print:py-0">
        {origem &&
          cards.map((c) => (
            <div
              key={c.numero}
              className="flex h-[88mm] break-inside-avoid flex-col items-center overflow-hidden border border-dashed border-[#9a9a9a] bg-white text-center text-[#111]"
            >
              <div className="h-[3mm] w-full" style={{ background: marca?.cor ?? "#f5b800" }} />
              <p className="mt-[3mm] max-w-[56mm] truncate px-[2mm] font-display text-[6mm] uppercase leading-none">{nome}</p>
              <p className="mt-[2mm] text-[2.6mm] font-semibold uppercase tracking-[0.3em] text-[#555]">Comanda</p>
              <p className="font-display text-[17mm] leading-[0.95]">{c.numero}</p>
              <div className="mt-[1mm] bg-white p-[1mm]">
                <QRCodeSVG
                  value={`${origem}/k/${c.token}`}
                  size={136}
                  level="M"
                  marginSize={1}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  title={`QR da comanda ${c.numero}`}
                />
              </div>
              <p className="mt-[2mm] px-[3mm] text-[2.8mm] leading-tight">Aponte a câmera para ver o cardápio e pedir.</p>
              <p className="mt-[1mm] px-[3mm] text-[2.3mm] leading-tight text-[#666]">Devolva o cartão no caixa ao pagar.</p>
            </div>
          ))}
      </div>
    </RoleGuard>
  );
}
