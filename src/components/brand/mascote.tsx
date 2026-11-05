/* eslint-disable @next/next/no-img-element */
import { Beer } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Coroa } from "./coroa";

/** Placeholder do mascote (pato com boné e coroa). Troque em lib/brand.ts. */
export function Mascote({ className }: { className?: string }) {
  if (BRAND.mascote) return <img src={BRAND.mascote} alt="" className={cn("object-contain", className)} />;
  return (
    <div
      aria-hidden
      className={cn(
        "relative grid place-items-center rounded-full border-2 border-red bg-[radial-gradient(circle_at_30%_25%,#c8102e,#5c0715)] shadow-[0_0_40px_#c8102e40]",
        className,
      )}
    >
      <Coroa className="absolute -top-[14%] h-[26%] w-[40%] text-gold drop-shadow" />
      <Beer className="h-[46%] w-[46%] text-gold" strokeWidth={1.6} />
    </div>
  );
}
