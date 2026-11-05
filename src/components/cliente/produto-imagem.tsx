/* eslint-disable @next/next/no-img-element */
import { Beer, CupSoda, Drumstick, Martini, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Produto } from "@/types";

const icones: Record<string, typeof Beer> = {
  c_chopp: Beer,
  c_drinks: Martini,
  c_petiscos: Drumstick,
  c_porcoes: UtensilsCrossed,
  c_semalcool: CupSoda,
};

/** fotos ilustrativas por categoria (apresentação/demo) — troque pelas fotos reais no admin */
const fotosCategoria: Record<string, string> = {
  c_chopp: "/produtos/chopp.jpg",
  c_drinks: "/produtos/drink.jpg",
  c_petiscos: "/produtos/petiscos.jpg",
  c_porcoes: "/produtos/porcao.jpg",
  c_semalcool: "/produtos/semalcool.jpg",
};

/** foto do produto, foto ilustrativa da categoria ou placeholder com ícone */
export function ProdutoImagem({ produto, className }: { produto: Pick<Produto, "imagemUrl" | "categoriaId" | "nome">; className?: string }) {
  const src = produto.imagemUrl ?? fotosCategoria[produto.categoriaId];
  if (src) {
    return <img src={src} alt={produto.nome} className={cn("object-cover", className)} loading="lazy" />;
  }
  const Icon = icones[produto.categoriaId] ?? UtensilsCrossed;
  return (
    <div
      aria-hidden
      className={cn(
        "grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#3a2a12,#1a1a1c_70%)]",
        className,
      )}
    >
      <Icon className="h-1/3 w-1/3 text-gold/80" strokeWidth={1.5} />
    </div>
  );
}
