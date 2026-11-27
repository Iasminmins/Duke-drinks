import test from "node:test";
import assert from "node:assert/strict";
import { hashOperacao, quantidadeVendaValida, saldoPermiteVenda, vendaBalcaoPodeSerEstornada, pedidoPodeSerCriado } from "../src/lib/operacao-segura.ts";
import { dataISOEmFuso, deslocarDataISO } from "../src/lib/data.ts";
import { podeVincularEstabelecimento, podeAlternarEstabelecimento } from "../src/lib/grupos.ts";
import { precoProfissionalPorQuantidade, receitaProfissionalPorGrupos } from "../src/lib/planos.ts";

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

test("data do histórico segue São Paulo após a meia-noite UTC", () => {
  assert.equal(dataISOEmFuso(new Date("2026-11-27T01:30:00.000Z")), "2026-11-26");
});

test("datas do histórico recuam dias de calendário na virada do mês", () => {
  assert.equal(deslocarDataISO("2026-03-01", -7), "2026-02-22");
});

test("estorno de venda exige caixa aberto e não pode ter documento fiscal", () => {
  assert.equal(vendaBalcaoPodeSerEstornada({ status: "concluida", caixaFechado: false, fiscalStatus: null }), true);
  assert.equal(vendaBalcaoPodeSerEstornada({ status: "cancelada", caixaFechado: false, fiscalStatus: null }), false);
  assert.equal(vendaBalcaoPodeSerEstornada({ status: "concluida", caixaFechado: true, fiscalStatus: null }), false);
  assert.equal(vendaBalcaoPodeSerEstornada({ status: "concluida", caixaFechado: false, fiscalStatus: "pendente" }), false);
  assert.equal(vendaBalcaoPodeSerEstornada({ status: "concluida", caixaFechado: false, fiscalStatus: "autorizado" }), false);
  assert.equal(vendaBalcaoPodeSerEstornada({ status: "concluida", caixaFechado: false, fiscalStatus: "rejeitado" }), false);
});

test("pedido só entra em comanda aberta e cliente precisa validar o QR", () => {
  assert.equal(pedidoPodeSerCriado({ status: "aberta", origem: "cliente", codigoValido: true }), true);
  assert.equal(pedidoPodeSerCriado({ status: "aberta", origem: "cliente", codigoValido: false }), false);
  assert.equal(pedidoPodeSerCriado({ status: "aguardando_pagamento", origem: "cliente", codigoValido: true }), false);
  assert.equal(pedidoPodeSerCriado({ status: "fechada", origem: "garcom", codigoValido: true }), false);
});

test("preço profissional mantém a tabela aprovada por estabelecimento", async () => {
  const { precoProfissionalPorQuantidade } = await import("../src/lib/planos.ts");
  assert.equal(precoProfissionalPorQuantidade(1), 139);
  assert.equal(precoProfissionalPorQuantidade(2), 259);
  assert.equal(precoProfissionalPorQuantidade(3), 379);
});

test("receita mensal soma o preço aprovado por grupo de estabelecimentos ativos", async () => {
  const { receitaProfissionalPorGrupos } = await import("../src/lib/planos.ts");
  assert.equal(receitaProfissionalPorGrupos([
    { id: "a", grupoId: "g1", status: "ativo", estabelecimentosNoGrupo: 2 },
    { id: "b", grupoId: "g1", status: "ativo", estabelecimentosNoGrupo: 2 },
    { id: "c", grupoId: "g2", status: "ativo" },
    { id: "d", grupoId: "g1", status: "trial", estabelecimentosNoGrupo: 2 },
  ]), 398);
  assert.equal(receitaProfissionalPorGrupos([
    { id: "a", grupoId: "g1", status: "ativo" },
    { id: "b", grupoId: "g1", status: "suspenso" },
  ]), 139);
});

test("modelo do tipo de negócio sugere só categorias ainda não cadastradas", async () => {
  const { categoriasModeloFaltantes, usaFluxoComandas } = await import("../src/lib/planos.ts");
  assert.deepEqual(categoriasModeloFaltantes("casa_carnes", ["Carnes", "BEBIDAS"]), [
    "Cortes especiais", "Acompanhamentos", "Cervejas", "Mercearia",
  ]);
  assert.equal(usaFluxoComandas("casa_carnes"), true);
  assert.equal(usaFluxoComandas("outro"), false);
});

test("vínculo entre lojas exige mesmo responsável, unidade independente e quantidade contratada", () => {
  const base = { emailOrigem: "dono@loja.com", emailDestino: "Dono@loja.com", lojasOrigem: 1, lojasDestino: 1, quantidadeSolicitada: 2 };
  assert.equal(podeVincularEstabelecimento(base), true);
  assert.equal(podeVincularEstabelecimento({ ...base, emailDestino: "outro@loja.com" }), false);
  assert.equal(podeVincularEstabelecimento({ ...base, lojasDestino: 2 }), false);
  assert.equal(podeVincularEstabelecimento({ ...base, lojasOrigem: 2 }), false);
});

test("só admin alterna para loja não cancelada do mesmo grupo", () => {
  assert.equal(podeAlternarEstabelecimento({ papel: "admin", mesmoGrupo: true, cancelado: false }), true);
  assert.equal(podeAlternarEstabelecimento({ papel: "caixa", mesmoGrupo: true, cancelado: false }), false);
  assert.equal(podeAlternarEstabelecimento({ papel: "admin", mesmoGrupo: false, cancelado: false }), false);
  assert.equal(podeAlternarEstabelecimento({ papel: "admin", mesmoGrupo: true, cancelado: true }), false);
});
