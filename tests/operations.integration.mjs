import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { poolPlataforma, comTenant } from "../src/server/db.ts";
import { abrirCaixa, fecharCaixa, registrarPagamento, estornarPagamento, resumoCaixa } from "../src/server/handlers/caixa.ts";
import { registrarVendaBalcao, estornarVendaBalcao, listarEstoque, listarVendasBalcao } from "../src/server/handlers/balcao.ts";
import { criarPedido, listarTickets, avancarTicket, marcarEntregue } from "../src/server/handlers/pedidos.ts";
import { getComanda } from "../src/server/handlers/comandas.ts";
import { alternarEstabelecimento, listarEstabelecimentosAcessiveis, listarUsuarios } from "../src/server/handlers/acesso.ts";
import { getResumoDashboard } from "../src/server/handlers/relatorios.ts";

const databaseUrl = process.env.CODEX_TEST_DATABASE_URL ?? "";
const expectedDatabaseHost = process.env.CODEX_TEST_DATABASE_HOST ?? "";
assert.ok(expectedDatabaseHost && new URL(databaseUrl).hostname === expectedDatabaseHost,
  "Set the exact temporary Neon branch endpoint host before running integration tests.");

const pool = poolPlataforma();
const prefix = `qa-${randomUUID().replaceAll("-", "")}`;
const fixture = { groupId: `${prefix}_grp`, tenants: [], users: [], products: { cozinha: "", bar: "" }, orderId: "", cashId: "", saleId: "", paymentId: "", commandId: "", commandToken: randomUUID() };

function context(tenant, uid, papel = "admin", plataformaHost = false) {
  return { sessao: { uid, papel }, tenant, plataformaLogada: false, plataformaHost, ip: "127.0.0.1",
    iniciarSessao: () => {}, encerrarSessao: () => {}, iniciarSessaoPlataforma: () => {} };
}

async function setup() {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("insert into grupos_estabelecimentos(id,nome) values($1,'QA fictício')", [fixture.groupId]);
    for (const [index, slug] of ["a", "b"].entries()) {
      const id = `${prefix}_${slug}`;
      fixture.tenants.push({ id, slug: `${prefix}-${slug}`, tipo: "bar", plano: "profissional", status: "ativo", trialAte: null, pagoAte: null });
      await db.query(`insert into tenants(id,slug,tipo,plano,status,responsavel_nome,responsavel_email,grupo_id)
        values($1,$2,'bar','profissional','ativo','QA Fictício','qa@example.invalid',$3)`, [id, `${prefix}-${slug}`, fixture.groupId]);
      await db.query("select set_config('app.eid',$1,true)", [id]);
      await db.query("set local role app_rls");
      await db.query("insert into estabelecimento(id,nome,modulos) values($1,$2,$3)", [id, `QA Fictício ${slug}`, JSON.stringify({ balcao: true, estoque: true, nfce: false })]);
      const user = await db.query("insert into usuarios(nome,papel,login,senha_hash) values('QA Fictício','admin',$1,'hash-de-teste') returning id", [`${prefix}_${slug}`]);
      fixture.users.push(user.rows[0].id);
      const kitchen = await db.query("insert into setores(nome,slug) values('Cozinha','cozinha') returning id");
      const bar = await db.query("insert into setores(nome,slug) values('Bar','bar') returning id");
      const category = await db.query("insert into categorias(nome,ordem) values('QA','1') returning id");
      if (index === 0) {
        const product = await db.query(`insert into produtos(nome,preco,categoria_id,setor_id,controla_estoque,estoque,unidade)
          values('Produto QA',10,$1,$2,true,7,'un') returning id`, [category.rows[0].id, kitchen.rows[0].id]);
        fixture.products.cozinha = product.rows[0].id;
        const drink = await db.query(`insert into produtos(nome,preco,categoria_id,setor_id,controla_estoque,estoque,unidade)
          values('Bebida QA',5,$1,$2,false,0,'un') returning id`, [category.rows[0].id, bar.rows[0].id]);
        fixture.products.bar = drink.rows[0].id;
        const command = await db.query(`insert into comandas(numero,token,aberta_por,cobrar_taxa_servico)
          values($1,$2,$3,false) returning id`, [900000 + Math.floor(Math.random() * 9999), fixture.commandToken, user.rows[0].id]);
        fixture.commandId = command.rows[0].id;
      }
      await db.query("reset role");
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally { db.release(); }
}

before(setup);
after(async () => {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("delete from tenants where id=any($1::text[])", [fixture.tenants.map((t) => t.id)]);
    await db.query("delete from grupos_estabelecimentos where id=$1", [fixture.groupId]);
    await db.query("commit");
  } catch (error) { await db.query("rollback"); throw error; }
  finally { db.release(); await pool.end(); }
});

test("venda, baixa, estorno, fechamento, QR, produção e isolamento por estabelecimento", async () => {
  const [a, b] = fixture.tenants;
  const adminA = context(a, fixture.users[0], "admin", true);
  const caixa = await comTenant(a.id, () => abrirCaixa(adminA, 20));
  fixture.cashId = caixa.id;

  const primeiraChave = randomUUID();
  const vendaInput = { itens: [{ produtoId: fixture.products.cozinha, quantidade: 2 }], forma: "dinheiro", valorRecebido: 25, requestKey: primeiraChave };
  const venda = await comTenant(a.id, () => registrarVendaBalcao(adminA, vendaInput));
  fixture.saleId = venda.id;
  const repetida = await comTenant(a.id, () => registrarVendaBalcao(adminA, vendaInput));
  assert.equal(repetida.id, venda.id, "replay must return the original sale");
  assert.equal((await comTenant(a.id, () => listarEstoque(adminA))).find((p) => p.id === fixture.products.cozinha).estoque, 5);

  await comTenant(a.id, () => estornarVendaBalcao(adminA, venda.id, "Teste de estorno QA"));
  await assert.rejects(() => comTenant(a.id, () => estornarVendaBalcao(adminA, venda.id, "Teste repetido QA")));
  assert.equal((await comTenant(a.id, () => listarEstoque(adminA))).find((p) => p.id === fixture.products.cozinha).estoque, 7);
  assert.equal((await comTenant(a.id, () => listarVendasBalcao(adminA))).find((v) => v.id === venda.id).status, "cancelada");

  const vendaFinal = await comTenant(a.id, () => registrarVendaBalcao(adminA, {
    itens: [{ produtoId: fixture.products.cozinha, quantidade: 1 }], forma: "pix", requestKey: randomUUID(),
  }));
  await comTenant(a.id, () => fecharCaixa(adminA, caixa.id, { dinheiro: 20, pix: 10 }));
  await assert.rejects(() => comTenant(a.id, () => estornarVendaBalcao(adminA, vendaFinal.id, "Caixa já fechado")));
  const fechamento = await comTenant(a.id, () => resumoCaixa(adminA, caixa.id));
  assert.equal(fechamento.totalVendas, 10, "cash totals must exclude the reversed sale");

  const caixaNovo = await comTenant(a.id, () => abrirCaixa(adminA, 0));
  const cliente = { ...adminA, sessao: null, plataformaHost: false };
  await assert.rejects(() => comTenant(a.id, () => criarPedido(cliente, { comandaId: fixture.commandId, codigo: "QR-INVÁLIDO", origem: "cliente", itens: [{ produtoId: fixture.products.cozinha, quantidade: 1 }] })));
  const pedido = await comTenant(a.id, () => criarPedido(cliente, { comandaId: fixture.commandId, codigo: fixture.commandToken, origem: "cliente", itens: [
    { produtoId: fixture.products.cozinha, quantidade: 1 }, { produtoId: fixture.products.bar, quantidade: 1 },
  ] }));
  fixture.orderId = pedido.id;
  const cozinha = context(a, fixture.users[0], "cozinha");
  const ticketsCozinha = await comTenant(a.id, () => listarTickets(cozinha, "cozinha"));
  assert.equal(ticketsCozinha.length, 1);
  assert.equal(ticketsCozinha[0].itens[0].produtoId, fixture.products.cozinha);
  assert.equal(await comTenant(a.id, () => avancarTicket(cozinha, pedido.id, "cozinha")), "preparando");
  assert.equal(await comTenant(a.id, () => avancarTicket(cozinha, pedido.id, "cozinha")), "pronto");
  const bar = context(a, fixture.users[0], "bar");
  const ticketsBar = await comTenant(a.id, () => listarTickets(bar, "bar"));
  assert.equal(ticketsBar.length, 1);
  assert.equal(ticketsBar[0].itens[0].produtoId, fixture.products.bar);
  assert.equal(await comTenant(a.id, () => avancarTicket(bar, pedido.id, "bar")), "preparando");
  assert.equal(await comTenant(a.id, () => avancarTicket(bar, pedido.id, "bar")), "pronto");
  await comTenant(a.id, () => marcarEntregue(context(a, fixture.users[0], "garcom"), pedido.id));
  const detalhe = await comTenant(a.id, () => getComanda(adminA, fixture.commandId));
  const pagamento = await comTenant(a.id, () => registrarPagamento(adminA, {
    comandaId: fixture.commandId, forma: "pix", valor: detalhe.totais.restante, requestKey: randomUUID(),
  }));
  fixture.paymentId = pagamento.pagamento.id;
  assert.equal(pagamento.comandaFechada, true);
  await comTenant(a.id, () => fecharCaixa(adminA, caixaNovo.id, { pix: detalhe.totais.restante }));
  await assert.rejects(() => comTenant(a.id, () => estornarPagamento(adminA, pagamento.pagamento.id, "Estorno após fechamento")));

  assert.deepEqual((await comTenant(b.id, () => listarEstoque(context(b, fixture.users[1])))).map((p) => p.nome), [], "store B must not see store A's stock");
  assert.deepEqual((await comTenant(b.id, () => listarUsuarios(context(b, fixture.users[1])))).map((u) => u.login), [`${prefix}_b`]);
  assert.equal((await comTenant(a.id, () => listarEstoque(adminA))).length, 2);
  assert.deepEqual((await comTenant(a.id, () => listarUsuarios(adminA))).map((u) => u.login), [`${prefix}_a`]);
  assert.equal((await comTenant(a.id, () => getResumoDashboard(adminA))).faturamentoDia > 0, true);
  assert.equal((await comTenant(b.id, () => getResumoDashboard(context(b, fixture.users[1])))).faturamentoDia, 0);
  await assert.rejects(() => comTenant(b.id, () => resumoCaixa(context(b, fixture.users[1]), caixa.id)));
  const acessiveis = await comTenant(a.id, () => listarEstabelecimentosAcessiveis(adminA));
  assert.equal(acessiveis.length, 2);
  let usuarioDaTroca;
  await comTenant(a.id, () => alternarEstabelecimento(adminA, b.id).then((r) => { usuarioDaTroca = r.usuario.id; }));
  assert.equal(usuarioDaTroca, fixture.users[1]);
});
