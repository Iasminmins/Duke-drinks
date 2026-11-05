"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/** link do cardápio da comanda; usa a origem atual (localhost em teste, domínio real em produção) */
export function useUrlComanda(token: string) {
  const [origem, setOrigem] = useState("");
  useEffect(() => {
    setOrigem(window.location.origin);
  }, []);
  return origem ? `${origem}/c/${token}` : "";
}

export function ComandaQR({ token, numero, tamanho = 120, claro }: { token: string; numero: number; tamanho?: number; claro?: boolean }) {
  const url = useUrlComanda(token);
  if (!url) return <div style={{ width: tamanho, height: tamanho }} aria-hidden />;
  return (
    <QRCodeSVG
      value={url}
      size={tamanho}
      level="M"
      bgColor={claro ? "#ffffff" : "#f5ecd7"}
      fgColor="#0f0f10"
      marginSize={1}
      title={`QR code da comanda ${numero}`}
    />
  );
}
