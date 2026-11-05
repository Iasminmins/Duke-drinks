import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-[10px] border border-line bg-bg-soft px-3 text-cream placeholder:text-subtle transition-colors focus:border-gold focus:outline-none aria-[invalid=true]:border-red";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(base, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(base, "min-h-20 py-2.5", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(base, "h-11 appearance-none bg-[length:16px] pr-9", className)} {...props}>
      {children}
    </select>
  );
});

export function Field({
  label,
  htmlFor,
  erro,
  dica,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {erro ? (
        <p role="alert" className="text-xs text-red">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-xs text-subtle">{dica}</p>
      ) : null}
    </div>
  );
}
