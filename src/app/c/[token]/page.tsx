import type { Metadata } from "next";
import { ClienteApp } from "@/components/cliente/cliente-app";

export const metadata: Metadata = { title: "Cardápio · Duke", robots: { index: false } };

export default async function ComandaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ClienteApp token={token} />;
}
