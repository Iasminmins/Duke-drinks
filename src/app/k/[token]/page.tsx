"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { entrarPorCartao, entrarPorQr } from "@/services/mesas.service";
import { mensagemErro } from "@/lib/errors";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "livre"; numero: number }
  | { tipo: "confirmar"; numero: number }
  | { tipo: "erro"; msg: string };

const chave = (t: string) => `cartao:${t}`;
const lerSalvo = (t: string) => {
  try {
    return localStorage.getItem(chave(t));
  } catch {
    return null;
  }
};
const salvar = (t: string, comanda: string | null) => {
  try {
    if (comanda) localStorage.setItem(chave(t), comanda);
    else localStorage.removeItem(chave(t));
  } catch {}
};

/**
 * QR fixo impresso no cartão de comanda: /k/<token do cartão>.
 * Leva o cliente para a comanda aberta naquele número. Na primeira vez em cada celular,
 * confirma os 4 últimos dígitos do celular que o garçom anotou.
 */
export default function CartaoPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [digitos, setDigitos] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroDigitos, setErroDigitos] = useState<string | null>(null);
  const iniciou = useRef(false);

  const irPara = (comanda: string) => {
    salvar(token, comanda);
    router.replace(`/c/${comanda}`);
  };

  const verificar = async () => {
    setEstado({ tipo: "carregando" });
    try {
      // este celular já confirmou a comanda atual deste cartão? então entra direto
      const salvo = lerSalvo(token);
      if (salvo) {
        try {
          const c = await entrarPorQr(salvo);
          if (c.status === "aberta" || c.status === "aguardando_pagamento") return irPara(salvo);
        } catch {}
        salvar(token, null);
      }
      const r = await entrarPorCartao(token);
      if (r.situacao === "liberada" && r.token) return irPara(r.token);
      setEstado(r.situacao === "livre" ? { tipo: "livre", numero: r.numero } : { tipo: "confirmar", numero: r.numero });
    } catch (e) {
      setEstado({ tipo: "erro", msg: mensagemErro(e) });
    }
  };

  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    void verificar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmar = async () => {
    if (digitos.length !== 4 || enviando) return;
    setEnviando(true);
    setErroDigitos(null);
    try {
      const r = await entrarPorCartao(token, digitos);
      if (r.situacao === "liberada" && r.token) return irPara(r.token);
      if (r.situacao === "livre") setEstado({ tipo: "livre", numero: r.numero });
    } catch (e) {
      setErroDigitos(mensagemErro(e));
      setDigitos("");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="bg-pub flex min-h-dvh flex-col items-center px-5 py-10 text-center">
      <Logo />
      <div className="mt-10 w-full max-w-sm">
        {estado.tipo === "carregando" && (
          <div className="flex flex-col items-center gap-3 text-muted">
            <Loader2 className="h-7 w-7 animate-spin text-gold" />
            Abrindo a sua comanda…
          </div>
        )}

        {estado.tipo === "livre" && (
          <>
            <p className="text-sm text-muted">Comanda</p>
            <p className="font-display text-7xl leading-none text-gold">{estado.numero}</p>
            <p className="mt-5 text-lg">Esta comanda ainda não foi aberta.</p>
            <p className="mt-2 text-muted">Chame o garçom para abrir a comanda no seu nome. Depois é só escanear de novo.</p>
            <Button variant="secondary" className="mt-6" onClick={() => void verificar()}>
              Já abriram, tentar de novo
            </Button>
          </>
        )}

        {estado.tipo === "confirmar" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirmar();
            }}
          >
            <p className="text-sm text-muted">Comanda</p>
            <p className="font-display text-7xl leading-none text-gold">{estado.numero}</p>
            <p className="mt-5 text-lg">Confirme que esta comanda é sua</p>
            <p className="mt-2 text-muted">Digite os 4 últimos números do celular que você passou ao garçom.</p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              aria-label="4 últimos números do celular"
              value={digitos}
              onChange={(e) => {
                setErroDigitos(null);
                setDigitos(e.target.value.replace(/\D/g, "").slice(0, 4));
              }}
              placeholder="0000"
              className="mx-auto mt-6 block h-16 w-44 rounded-[12px] border border-line bg-bg-soft text-center font-display text-4xl tracking-[0.3em] text-cream placeholder:text-subtle focus:border-gold focus:outline-none"
            />
            {erroDigitos && (
              <p role="alert" className="mt-3 text-sm text-red">
                {erroDigitos}
              </p>
            )}
            <Button type="submit" size="lg" block className="mt-6" loading={enviando} disabled={digitos.length !== 4}>
              Ver cardápio e pedir
            </Button>
            <p className="mt-4 text-xs text-subtle">É só nesta primeira vez. Depois o cartão abre direto neste celular.</p>
          </form>
        )}

        {estado.tipo === "erro" && (
          <>
            <p className="font-display text-4xl">Não deu para abrir</p>
            <p className="mt-3 text-muted">{estado.msg}</p>
            <Button variant="secondary" className="mt-6" onClick={() => void verificar()}>
              Tentar de novo
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
