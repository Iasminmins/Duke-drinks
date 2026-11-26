import test from "node:test";
import assert from "node:assert/strict";
import { hashOperacao, quantidadeVendaValida, saldoPermiteVenda } from "../src/lib/operacao-segura.ts";

test("repetir o mesmo rascunho mantém o mesmo hash e alteração de valor muda a operação", () => {
  const operacao = { comandaId: "fake-1", forma: "pix", valor: 12.5 };
  assert.equal(hashOperacao(operacao), hashOperacao({ ...operacao }));
  assert.notEqual(hashOperacao(operacao), hashOperacao({ ...operacao, valor: 13 }));
});

test("quantidade aceita peso fracionado com até 3 casas e recusa entrada inválida", () => {
  assert.equal(quantidadeVendaValida(1.125), true);
  assert.equal(quantidadeVendaValida(0.001), true);
  assert.equal(quantidadeVendaValida(1.1255), false);
  assert.equal(quantidadeVendaValida(0), false);
  assert.equal(quantidadeVendaValida(Number.NaN), false);
});

test("estoque insuficiente bloqueia só quando o produto controla saldo", () => {
  assert.equal(saldoPermiteVenda(true, 1, 1.2), false);
  assert.equal(saldoPermiteVenda(true, 1.2, 1.2), true);
  assert.equal(saldoPermiteVenda(false, 0, 3), true);
});
