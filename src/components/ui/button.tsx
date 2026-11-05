import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variantes = {
  primary: "bg-gold text-bg hover:bg-gold-600 active:bg-gold-600 font-semibold",
  danger: "bg-red text-cream hover:bg-red-600 font-semibold",
  secondary: "bg-surface text-cream hover:bg-surface-2 border border-line",
  ghost: "text-cream hover:bg-surface",
  outline: "border border-gold/60 text-gold hover:bg-gold-soft",
  success: "bg-ok text-bg hover:brightness-110 font-semibold",
} as const;

const tamanhos = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-14 px-6 text-base gap-2",
  icon: "h-11 w-11",
  "icon-sm": "h-9 w-9",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantes;
  size?: keyof typeof tamanhos;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, block, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-[10px] transition-[background,transform,filter] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variantes[variant],
        tamanhos[size],
        // "block" ocupa a largura disponível mas pode encolher ao dividir espaço com outro botão
        block && "w-full min-w-0 shrink",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
