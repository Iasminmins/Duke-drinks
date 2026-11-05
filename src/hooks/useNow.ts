"use client";

import { useEffect, useState } from "react";

/** relógio que re-renderiza a cada `intervalo` ms (timers do KDS, "há X min") */
export function useNow(intervalo = 15000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervalo);
    return () => clearInterval(t);
  }, [intervalo]);
  return agora;
}
