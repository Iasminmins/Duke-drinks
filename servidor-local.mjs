// Servidor simples para ver o site no computador (http://localhost:5500). Não precisa instalar nada.
// Uso: node servidor-local.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PASTA = fileURLToPath(new URL(".", import.meta.url));
const PORTA = 5500;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (caminho.endsWith("/")) caminho += "index.html";
  const arquivo = normalize(join(PASTA, caminho));
  if (!arquivo.startsWith(normalize(PASTA))) {
    res.writeHead(403).end();
    return;
  }
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { "content-type": TIPOS[extname(arquivo).toLowerCase()] ?? "application/octet-stream" });
    res.end(dados);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Página não encontrada");
  }
}).listen(PORTA, () => console.log(`Site do Comandou em http://localhost:${PORTA}`));
