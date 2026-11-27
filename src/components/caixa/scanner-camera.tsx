"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScannerCamera({ onCode, onClose, codigosProdutos }: { onCode: (code: string) => void; onClose: () => void; codigosProdutos: string[] }) {
  const video = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  const codigosRef = useRef(codigosProdutos);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [textoPronto, setTextoPronto] = useState(false);
  const [erroTexto, setErroTexto] = useState(false);

  useEffect(() => { onCodeRef.current = onCode; }, [onCode]);
  codigosRef.current = codigosProdutos;

  useEffect(() => {
    let cancelado = false;
    let parar: (() => void) | undefined;
    let workerRef: { terminate: () => Promise<unknown>; recognize: (imagem: HTMLCanvasElement) => Promise<{ data: { text: string; confidence: number } }>; setParameters: (params: Record<string, string>) => Promise<unknown> } | undefined;
    let temporizadorOCR: number | undefined;

    function encontrarCodigoCMD(texto: string) {
      const compacto = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
      for (let i = 0; i <= compacto.length - 13; i++) {
        const trecho = compacto.slice(i, i + 13);
        if (!/^[CG][MND][D0O][A-Z0-9]{10}$/.test(trecho)) continue;
        const numeros = trecho.slice(3).replace(/[OQD]/g, "0").replace(/[IL]/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/B/g, "8");
        const codigo = `CMD${numeros}`;
        if (codigosRef.current.some((item) => item.toUpperCase() === codigo)) return codigo;
      }
      return undefined;
    }

    function imagemDaMoldura(elemento: HTMLVideoElement) {
      if (!elemento.videoWidth || !elemento.videoHeight) return undefined;
      const canvas = document.createElement("canvas");
      const origemX = Math.round(elemento.videoWidth * 0.08);
      const origemY = Math.round(elemento.videoHeight * 0.25);
      const largura = Math.round(elemento.videoWidth * 0.84);
      const altura = Math.round(elemento.videoHeight * 0.5);
      canvas.width = largura * 2;
      canvas.height = altura * 2;
      const contexto = canvas.getContext("2d");
      if (!contexto) return undefined;
      contexto.filter = "grayscale(1) contrast(1.4)";
      contexto.imageSmoothingQuality = "high";
      contexto.drawImage(elemento, origemX, origemY, largura, altura, 0, 0, canvas.width, canvas.height);
      return canvas;
    }

    async function lerTexto(worker: NonNullable<typeof workerRef>) {
      try {
        const elemento = video.current;
        const imagem = elemento && imagemDaMoldura(elemento);
        if (!imagem || cancelado) return;
        const leitura = await worker.recognize(imagem);
        const codigo = leitura.data.confidence >= 25 ? encontrarCodigoCMD(leitura.data.text) : undefined;
        if (codigo && !cancelado) {
          cancelado = true;
          parar?.();
          onCodeRef.current(codigo);
          return;
        }
      } catch {
        if (!cancelado) setErroTexto(true);
      } finally {
        if (!cancelado) temporizadorOCR = window.setTimeout(() => void lerTexto(worker), 1100);
      }
    }

    async function iniciarOCR() {
      try {
        const { createWorker, PSM } = await import("tesseract.js");
        const worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_char_whitelist: "CMD0123456789",
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });
        if (cancelado) {
          await worker.terminate();
          return;
        }
        workerRef = worker;
        setTextoPronto(true);
        void lerTexto(worker);
      } catch {
        if (!cancelado) setErroTexto(true);
      }
    }

    async function iniciar() {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelado || !video.current) return;
        const dicas = new Map();
        dicas.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_8,
          BarcodeFormat.EAN_13,
          BarcodeFormat.ITF,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
        ]);
        dicas.set(DecodeHintType.TRY_HARDER, true);
        const leitor = new BrowserMultiFormatReader(dicas, { delayBetweenScanAttempts: 250 });
        const controles = await leitor.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video.current,
          (resultado, _erro, c) => {
            if (!resultado || cancelado) return;
            cancelado = true;
            (parar ?? (() => c.stop()))();
            if (temporizadorOCR) window.clearTimeout(temporizadorOCR);
            if (workerRef) void workerRef.terminate();
            onCodeRef.current(resultado.getText());
          },
        );
        parar = () => controles.stop();
        if (cancelado) controles.stop();
        else {
          setPronto(true);
          void iniciarOCR();
        }
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error && e.name === "NotAllowedError"
          ? "Permita o acesso à câmera no navegador para bipar o produto."
          : "Não foi possível abrir a câmera. Confira as permissões do navegador e tente novamente.");
      }
    }

    void iniciar();
    return () => {
      cancelado = true;
      parar?.();
      if (temporizadorOCR) window.clearTimeout(temporizadorOCR);
      if (workerRef) void workerRef.terminate();
    };
  }, []);

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-bg shadow-2xl">
      <div className="flex items-center justify-between border-b border-line p-4">
          <div><h2 id="scanner-title" className="font-semibold">Bipar com a câmera</h2><p className="mt-1 text-sm text-muted">Aponte para as barras do código ou para um QR do produto.</p></div>
        <Button variant="ghost" size="icon-sm" aria-label="Fechar câmera" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>
      <div className="space-y-3 p-4">
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={video} autoPlay muted playsInline className="aspect-video w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-gold shadow-[0_0_0_999px_rgb(0_0_0_/_25%)]" />
          {pronto && <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white"><Camera className="mr-1 inline h-3.5 w-3.5" /> {textoPronto ? "Câmera ativa" : "Preparando leitura de texto…"}</span>}
        </div>
        {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : erroTexto ? <p role="status" className="text-center text-sm text-warn">Não consegui ativar a leitura do código escrito. Mantenha as barras ou o QR dentro da moldura.</p> : <p className="text-center text-sm text-muted">Mantenha o código CMD escrito, as barras ou o QR dentro da moldura. Ao reconhecer um produto cadastrado, ele entra no caixa.</p>}
      </div>
    </div>
  </div>;
}
