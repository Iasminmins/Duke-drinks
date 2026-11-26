"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { formatarCelular, mascaraCelular } from "@/lib/format";
import type { Mesa } from "@/types";
import type { Cartao } from "@/services/mesas.service";

export interface OpcoesComanda {
  mesaId?: string;
  numero?: number;
}

/** nome + celular do dono da comanda (abrir comanda nova ou corrigir dados) */
export function ClienteDialog({
  open,
  onClose,
  titulo,
  descricao,
  inicial,
  confirmar,
  loading,
  mesas,
  cartoes,
  onSalvar,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  descricao?: string;
  inicial?: { nome?: string; celular?: string };
  confirmar: string;
  loading?: boolean;
  /** quando informado (abrir comanda), mostra os campos opcionais de mesa e nº do cartão */
  mesas?: Mesa[];
  /** cartões de comanda cadastrados no admin; com eles, o número é escolhido entre os livres */
  cartoes?: Cartao[];
  onSalvar: (nome: string, celular: string, opcoes: OpcoesComanda) => void;
}) {
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [mesaId, setMesaId] = useState("");
  const [numero, setNumero] = useState("");
  const pronto = nome.trim().length >= 2 && celular.replace(/\D/g, "").length >= 10;
  const abrindo = !!mesas;
  const livres = (cartoes ?? []).filter((c) => !c.emUso);
  const usaCartoes = (cartoes ?? []).length > 0;

  useEffect(() => {
    if (open) {
      setNome(inicial?.nome ?? "");
      setCelular(formatarCelular(inicial?.celular));
      setMesaId("");
      setNumero("");
    }
  }, [open, inicial?.nome, inicial?.celular]);

  const enviar = () =>
    onSalvar(nome, celular, { mesaId: mesaId || undefined, numero: numero ? Number(numero) : undefined });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titulo={titulo}
      descricao={descricao}
      largura="sm"
      rodape={
        <Button size="lg" block loading={loading} disabled={!pronto} onClick={() => pronto && enviar()}>
          {confirmar}
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (pronto && !loading) enviar();
        }}
      >
        <Field label="Nome do cliente" htmlFor="cmd-nome" erro={nome.length > 0 && nome.trim().length < 2 ? "Informe pelo menos 2 caracteres" : undefined}>
          <Input id="cmd-nome" autoFocus autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Carlos" />
        </Field>
        <Field label="Celular (com DDD)" htmlFor="cmd-cel" dica="Obrigatório para validar o acesso ao QR da comanda e proteger os pedidos do cliente." erro={celular.replace(/\D/g, "").length > 0 && celular.replace(/\D/g, "").length < 10 ? "Informe DDD e telefone com pelo menos 10 dígitos" : undefined}>
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
        {abrindo && (
          <>
            {usaCartoes ? (
              <Field
                label="Nº da comanda"
                htmlFor="cmd-num"
                dica={livres.length ? `${livres.length} livres agora.` : "Todas as comandas estão em uso. Cadastre mais no admin."}
              >
                <Select id="cmd-num" value={numero} onChange={(e) => setNumero(e.target.value)} disabled={!livres.length}>
                  <option value="">{livres.length ? `Próxima livre (${livres[0].numero})` : "Nenhuma livre"}</option>
                  {livres.map((c) => (
                    <option key={c.numero} value={c.numero}>
                      Comanda {c.numero}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Nº do cartão (opcional)" htmlFor="cmd-num" dica="Deixe vazio para usar o próximo número livre.">
                <Input
                  id="cmd-num"
                  inputMode="numeric"
                  autoComplete="off"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="ex.: 27"
                />
              </Field>
            )}
            {mesas.length > 0 && (
              <Field label="Mesa (opcional)" htmlFor="cmd-mesa" dica="Só se a pessoa for ficar numa mesa. O pedido é sempre da comanda.">
                <Select id="cmd-mesa" value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
                  <option value="">Sem mesa</option>
                  {mesas.filter((m) => m.ativa).map((m) => (
                    <option key={m.id} value={m.id}>Mesa {m.numero}</option>
                  ))}
                </Select>
              </Field>
            )}
          </>
        )}
        <button type="submit" className="sr-only" tabIndex={-1}>
          {confirmar}
        </button>
      </form>
    </Dialog>
  );
}
