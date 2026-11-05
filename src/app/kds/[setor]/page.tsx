import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/role-guard";
import { KdsBoard } from "@/components/kds/kds-board";
import type { Papel } from "@/types";

const titulo = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

export async function generateMetadata({ params }: { params: Promise<{ setor: string }> }): Promise<Metadata> {
  const { setor } = await params;
  return { title: `KDS · ${titulo(setor)}` };
}

export default async function KdsPage({ params }: { params: Promise<{ setor: string }> }) {
  const { setor } = await params;
  // cozinha e bar têm papel próprio; setores criados depois ficam acessíveis às duas equipes
  const papeis: Papel[] = setor === "cozinha" ? ["cozinha"] : setor === "bar" ? ["bar"] : ["cozinha", "bar"];
  return (
    <RoleGuard papeis={papeis}>
      <KdsBoard setor={setor} nome={titulo(setor)} />
    </RoleGuard>
  );
}
