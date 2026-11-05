"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/** URL pública da mesa; usa a origem atual (localhost na demo, domínio real em produção) */
export function useUrlMesa(numero: number) {
  const [origem, setOrigem] = useState("");
  useEffect(() => {
    setOrigem(window.location.origin);
  }, []);
  return `${origem}/m/${numero}`;
}

export function MesaQR({ numero, tamanho = 120, claro }: { numero: number; tamanho?: number; claro?: boolean }) {
  const url = useUrlMesa(numero);
  return (
    <QRCodeSVG
      value={url}
      size={tamanho}
      level="M"
      bgColor={claro ? "#ffffff" : "#f5ecd7"}
      fgColor="#0f0f10"
      marginSize={1}
      title={`QR code da mesa ${numero}`}
    />
  );
}
