import test from "node:test";
import assert from "node:assert/strict";
import { resolverHost } from "../src/lib/host.ts";

test("host principal continua sendo a plataforma compartilhada", () => {
  process.env.NEXT_PUBLIC_APP_DOMAIN = "comandou-tech.vercel.app";
  assert.deepEqual(resolverHost("comandou-tech.vercel.app"), { tipo: "plataforma" });
});

test("host Vercel desconhecido não herda a marca de um cliente padrão", () => {
  process.env.NEXT_PUBLIC_APP_DOMAIN = "comandou.app";
  process.env.DEFAULT_TENANT_SLUG = "duke";
  assert.deepEqual(resolverHost("comandou-tech.vercel.app"), { tipo: "plataforma" });
});

test("subdomínios identificam empresas separadas", () => {
  process.env.NEXT_PUBLIC_APP_DOMAIN = "comandou.app";
  assert.deepEqual(resolverHost("sheik.comandou.app"), { tipo: "tenant", slug: "sheik" });
  assert.deepEqual(resolverHost("duke.comandou.app"), { tipo: "tenant", slug: "duke" });
});

test("fallback local permanece disponível para desenvolvimento", () => {
  process.env.DEFAULT_TENANT_SLUG = "duke";
  assert.deepEqual(resolverHost("localhost:3000"), { tipo: "tenant", slug: "duke" });
});
