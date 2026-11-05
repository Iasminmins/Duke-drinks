import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClienteApp } from "@/components/cliente/cliente-app";

export async function generateMetadata({ params }: { params: Promise<{ mesa: string }> }): Promise<Metadata> {
  const { mesa } = await params;
  return { title: `Cardápio · Mesa ${mesa}` };
}

export default async function MesaPage({ params }: { params: Promise<{ mesa: string }> }) {
  const { mesa } = await params;
  const numero = Number(mesa);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  return <ClienteApp mesa={numero} />;
}
