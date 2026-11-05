import type { ReactNode } from "react";

export function PageHeader({ descricao, acoes }: { descricao?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {descricao ? <p className="text-sm text-muted">{descricao}</p> : <span />}
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
