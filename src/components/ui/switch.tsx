"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
        checked ? "border-gold bg-gold" : "border-line bg-surface-2",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full shadow transition-transform",
          checked ? "translate-x-6 bg-bg" : "translate-x-1 bg-muted",
        )}
      />
    </button>
  );
}
