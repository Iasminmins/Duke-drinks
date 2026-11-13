// Aplica um arquivo .sql no banco de DATABASE_URL.
// Uso:  node db/migrar.mjs db/migrations/001_multitenant.sql
// (lê DATABASE_URL do ambiente ou do .env.local)
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Informe o arquivo: node db/migrar.mjs db/migrations/xxx.sql");
  process.exit(1);
}

let url = process.env.DATABASE_URL;
if (!url && existsSync(".env.local")) {
  const linha = readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  url = linha?.slice("DATABASE_URL=".length).trim();
}
if (!url) {
  console.error("DATABASE_URL não encontrada");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(readFileSync(arquivo, "utf8"));
  console.log(`OK: ${arquivo} aplicado`);
} catch (e) {
  console.error(`ERRO em ${arquivo}:`, e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
