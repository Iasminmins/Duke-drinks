"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getPrimeirosPassos } from "@/services/plataforma.service";
import { cn } from "@/lib/utils";

const CHAVE_ESCONDIDO = "primeiros-passos-escondido";

/**
 * Guia de começo para quem acabou de criar a conta.
 * Aparece até o primeiro pedido ser feito (negócio que já está rodando, como o Duke, não vê)
 * ou até o dono clicar em "Esconder".
 */
export function PrimeirosPassos() {
  const params = useSearchParams();
  const q = useQuery({ queryKey: ["primeiros-passos"], queryFn: getPrimeirosPassos });
  const [escondido, setEscondido] = useState(true);
  const [endereco, setEndereco] = useState("");

  useEffect(() => {
    setEndereco(window.location.origin);
    try {
      setEscondido(localStorage.getItem(CHAVE_ESCONDIDO) === "1");
    } catch {
      setEscondido(false);
    }
  }, []);

  const d = q.data;
  if (!d || escondido) return null;

  const passos = [
    { feito: d.produtos > 0, titulo: "Cadastre os produtos", texto: "Nome, preço e foto. As categorias já vêm criadas pelo tipo do seu negócio.", href: "/admin/produtos", acao: "Cadastrar produtos" },
    { feito: d.temLogo, titulo: "Coloque sua logo e sua cor", texto: "Aparecem no cardápio do cliente e nas telas da equipe.", href: "/admin/configuracoes", acao: "Personalizar" },
    { feito: d.usuarios > 1, titulo: "Cadastre a equipe", texto: "Um acesso para cada pessoa: garçom, caixa, cozinha e bar.", href: "/admin/usuarios", acao: "Cadastrar equipe" },
    { feito: d.pedidos > 0, titulo: "Faça um pedido de teste", texto: "Abra uma comanda, aponte o celular para o QR e peça. O pedido aparece na tela da cozinha.", href: "/garcom", acao: "Abrir uma comanda" },
  ];
  const feitos = passos.filter((p) => p.feito).length;

  // negócio que já tem movimento não precisa do guia (a não ser logo depois do cadastro)
  if (d.pedidos > 0 && !params.get("bemvindo")) return null;
  if (feitos === passos.length) return null;

  const esconder = () => {
    setEscondido(true);
    try {
      localStorage.setItem(CHAVE_ESCONDIDO, "1");
    } catch {}
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(endereco);
      toast.success("Endereço copiado");
    } catch {
      toast.error("Não deu para copiar. Selecione o endereço e copie.");
    }
  };

  return (
    <Card className="border-gold/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl leading-none">
            {params.get("bemvindo") ? "Seu sistema está no ar" : "Primeiros passos"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {feitos} de {passos.length} feitos. Em poucos minutos dá para atender o primeiro cliente.
          </p>
        </div>
        <button onClick={esconder} className="text-sm text-subtle hover:text-cream">
          Esconder
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-bg-soft p-3 text-sm">
        <span className="text-muted">Endereço para a equipe entrar:</span>
        <span className="break-all font-semibold text-gold">{endereco}</span>
        <button
          onClick={copiar}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-3 hover:border-gold/50"
        >
          <Copy className="h-4 w-4" /> Copiar
        </button>
      </div>

      <ol className="mt-4 divide-y divide-line">
        {passos.map((p) => (
          <li key={p.titulo} className="flex flex-wrap items-center gap-3 py-3">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                p.feito ? "border-ok bg-ok text-bg" : "border-line text-transparent",
              )}
              aria-label={p.feito ? "Feito" : "A fazer"}
            >
              <Check className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold", p.feito && "text-muted line-through")}>{p.titulo}</p>
              {!p.feito && <p className="text-sm text-muted">{p.texto}</p>}
            </div>
            {!p.feito && (
              <Link
                href={p.href}
                className="inline-flex h-9 items-center rounded-[10px] bg-gold px-3 text-sm font-semibold text-bg hover:bg-gold-600"
              >
                {p.acao}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
