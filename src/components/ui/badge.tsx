import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tons = {
  neutral: "bg-surface-2 text-muted",
  gold: "bg-gold-soft text-gold",
  red: "bg-red-soft text-[#ff6b7f]",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
} as const;

export type TomBadge = keyof typeof tons;

export function Badge({ tom = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tom?: TomBadge }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tons[tom], className)}
      {...props}
    />
  );
}
