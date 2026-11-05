"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { formatarCelular, mascaraCelular } from "@/lib/format";

/** nome + celular do dono da comanda (abrir comanda nova ou corrigir dados) */
export function ClienteDialog({
  open,
  onClose,
  titulo,
  descricao,
  inicial,
  confirmar,
  loading,
  onSalvar,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  descricao?: string;
  inicial?: { nome?: string; celular?: string };
  confirmar: string;
  loading?: boolean;
  onSalvar: (nome: string, celular: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const pronto = nome.trim().length >= 2 && celular.replace(/\D/g, "").length >= 10;

  useEffect(() => {
    if (open) {
      setNome(inicial?.nome ?? "");
      setCelular(formatarCelular(inicial?.celular));
    }
  }, [open, inicial?.nome, inicial?.celular]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titulo={titulo}
      descricao={descricao}
      largura="sm"
      rodape={
        <Button size="lg" block loading={loading} disabled={!pronto} onClick={() => pronto && onSalvar(nome, celular)}>
          {confirmar}
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (pronto && !loading) onSalvar(nome, celular);
        }}
      >
        <Field label="Nome do cliente" htmlFor="cmd-nome">
          <Input id="cmd-nome" autoFocus autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Carlos" />
        </Field>
        <Field label="Celular (com DDD)" htmlFor="cmd-cel">
          <Input
            id="cmd-cel"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={celular}
            onChange={(e) => setCelular(mascaraCelular(e.target.value))}
            placeholder="(24) 99999-8888"
          />
        </Field>
        <button type="submit" className="sr-only" tabIndex={-1}>
          {confirmar}
        </button>
      </form>
    </Dialog>
  );
}
