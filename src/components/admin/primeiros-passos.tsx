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

  const salão = ["bar", "restaurante", "hamburgueria", "lanchonete", "pizzaria", "cafeteria"].includes(d.tipoNegocio);
  const passos = d.modulos?.balcao && !salão
    ? [
        { feito: d.produtos > 0, titulo: "Cadastre os produtos", texto: "Inclua nome, preço e unidade para começar as vendas.", href: "/admin/produtos", acao: "Cadastrar produtos" },
        { feito: d.comCodigoBarras > 0, titulo: "Cadastre códigos de barras", texto: "Bipe os produtos no caixa ou gere um código interno no cadastro.", href: "/admin/produtos", acao: "Adicionar códigos", },
        ...(d.modulos.estoque ? [{ feito: d.comEstoque > 0, titulo: "Configure o estoque inicial", texto: "Ative o controle de estoque e informe o saldo dos produtos.", href: "/admin/estoque", acao: "Configurar estoque" }] : []),
        { feito: d.vendasBalcao > 0, titulo: "Faça a primeira venda", texto: "Abra o caixa e registre uma venda de teste.", href: "/caixa/balcao", acao: "Abrir caixa de balcão" },
        { feito: d.temLogo, titulo: "Personalize sua loja", texto: "Adicione a logo e os dados do estabelecimento.", href: "/admin/configuracoes", acao: "Personalizar" },
      ]
    : [
        { feito: d.produtos > 0, titulo: "Cadastre os produtos", texto: "Inclua nome, preço e escolha o setor que prepara cada item.", href: "/admin/produtos", acao: "Cadastrar produtos" },
        { feito: d.setores > 0, titulo: "Confira os setores de produção", texto: "Direcione os itens para cozinha, bar ou outros setores.", href: "/admin/setores", acao: "Ver setores" },
        { feito: d.pedidos > 0, titulo: "Abra a primeira comanda", texto: "O garçom acompanha pedidos e confirma a entrega.", href: "/garcom", acao: "Abrir atendimento" },
        { feito: d.pedidosQr > 0, titulo: "Teste o pedido pelo QR", texto: "Confira a chegada do pedido na produção e no atendimento.", href: "/admin/mesas", acao: "Ver QRs" },
        { feito: d.comandasFechadas > 0, titulo: "Feche a primeira conta", texto: "Confira os valores e a taxa de serviço no caixa.", href: "/caixa", acao: "Abrir comandas" },
        { feito: d.temLogo, titulo: "Personalize sua loja", texto: "Adicione a logo e os dados do estabelecimento.", href: "/admin/configuracoes", acao: "Personalizar" },
      ];
  const feitos = passos.filter((p) => p.feito).length;

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
            {feitos} de {passos.length} feitos. A lista acompanha os recursos e os dados desta loja.
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
