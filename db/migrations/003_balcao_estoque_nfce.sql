-- Modos de operacao, produtos com codigo de barras/estoque, vendas de balcao e NFC-e.
-- Aplique com: node db/migrar.mjs db/migrations/003_balcao_estoque_nfce.sql

begin;

alter table tenants drop constraint if exists tenants_tipo_check;
alter table tenants add constraint tenants_tipo_check
  check (tipo in ('bar','restaurante','hamburgueria','lanchonete','pizzaria','cafeteria','casa_carnes','outro'));

alter table estabelecimento
  add column if not exists modulos jsonb not null default '{"balcao":false,"estoque":false,"nfce":false}'::jsonb,
  add column if not exists fiscal_cnpj text not null default '',
  add column if not exists fiscal_ie text not null default '',
  add column if not exists fiscal_uf char(2) not null default '',
  add column if not exists fiscal_codigo_municipio text not null default '',
  add column if not exists fiscal_regime text not null default '',
  add column if not exists fiscal_ambiente text not null default 'homologacao'
    check (fiscal_ambiente in ('homologacao','producao'));

alter table produtos
  add column if not exists codigo_barras text,
  add column if not exists controla_estoque boolean not null default false,
  add column if not exists estoque numeric(12,3) not null default 0 check (estoque >= 0),
  add column if not exists estoque_minimo numeric(12,3) not null default 0 check (estoque_minimo >= 0),
  add column if not exists unidade text not null default 'un',
  add column if not exists ncm text not null default '',
  add column if not exists cest text not null default '',
  add column if not exists cfop text not null default '',
  add column if not exists origem_icms text not null default '',
  add column if not exists cst_icms text not null default '',
  add column if not exists cst_pis text not null default '',
  add column if not exists cst_cofins text not null default '';

create unique index if not exists produtos_codigo_barras_uq
  on produtos (estabelecimento_id, codigo_barras) where codigo_barras is not null and codigo_barras <> '';

create table if not exists vendas_balcao (
  id text primary key default gen_random_uuid()::text,
  estabelecimento_id text not null default app_eid() references tenants(id) on delete cascade,
  caixa_id text not null,
  usuario_id text not null,
  numero bigint generated always as identity,
  status text not null default 'concluida' check (status in ('concluida','cancelada')),
  cliente_nome text,
  cliente_documento text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  total numeric(12,2) not null check (total >= 0),
  criado_em timestamptz not null default now(),
  unique (estabelecimento_id, id),
  foreign key (estabelecimento_id, caixa_id) references caixas(estabelecimento_id, id),
  foreign key (estabelecimento_id, usuario_id) references usuarios(estabelecimento_id, id)
);
create index if not exists vendas_balcao_criado_idx on vendas_balcao(estabelecimento_id, criado_em desc);

create table if not exists itens_venda_balcao (
  id text primary key default gen_random_uuid()::text,
  estabelecimento_id text not null default app_eid() references tenants(id) on delete cascade,
  venda_id text not null,
  produto_id text not null,
  codigo_barras text,
  nome text not null,
  unidade text not null default 'un',
  quantidade numeric(12,3) not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  total numeric(12,2) not null check (total >= 0),
  unique (estabelecimento_id, id),
  foreign key (estabelecimento_id, venda_id) references vendas_balcao(estabelecimento_id, id),
  foreign key (estabelecimento_id, produto_id) references produtos(estabelecimento_id, id)
);
create index if not exists itens_venda_balcao_venda_idx on itens_venda_balcao(estabelecimento_id, venda_id);

create table if not exists pagamentos_venda_balcao (
  id text primary key default gen_random_uuid()::text,
  estabelecimento_id text not null default app_eid() references tenants(id) on delete cascade,
  venda_id text not null,
  caixa_id text not null,
  forma text not null check (forma in ('dinheiro','pix','debito','credito','outro')),
  valor numeric(12,2) not null check (valor > 0),
  valor_recebido numeric(12,2),
  troco numeric(12,2),
  criado_em timestamptz not null default now(),
  foreign key (estabelecimento_id, venda_id) references vendas_balcao(estabelecimento_id, id),
  foreign key (estabelecimento_id, caixa_id) references caixas(estabelecimento_id, id)
);
create index if not exists pagamentos_venda_balcao_caixa_idx on pagamentos_venda_balcao(estabelecimento_id, caixa_id);

create table if not exists movimentos_estoque (
  id text primary key default gen_random_uuid()::text,
  estabelecimento_id text not null default app_eid() references tenants(id) on delete cascade,
  produto_id text not null,
  usuario_id text not null,
  venda_id text,
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade numeric(12,3) not null check (quantidade > 0),
  observacao text not null default '',
  criado_em timestamptz not null default now(),
  foreign key (estabelecimento_id, produto_id) references produtos(estabelecimento_id, id),
  foreign key (estabelecimento_id, usuario_id) references usuarios(estabelecimento_id, id),
  foreign key (estabelecimento_id, venda_id) references vendas_balcao(estabelecimento_id, id)
);
create index if not exists movimentos_estoque_produto_idx on movimentos_estoque(estabelecimento_id, produto_id, criado_em desc);

create table if not exists documentos_fiscais (
  id text primary key default gen_random_uuid()::text,
  estabelecimento_id text not null default app_eid() references tenants(id) on delete cascade,
  venda_id text not null,
  provedor_ref text not null,
  status text not null default 'pendente' check (status in ('pendente','autorizado','rejeitado','cancelado')),
  numero text,
  serie text,
  chave_acesso text,
  protocolo text,
  url_danfe text,
  url_xml text,
  url_qrcode text,
  url_consulta_nf text,
  mensagem text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (estabelecimento_id, provedor_ref),
  unique (estabelecimento_id, venda_id),
  foreign key (estabelecimento_id, venda_id) references vendas_balcao(estabelecimento_id, id)
);

grant select, insert, update, delete on vendas_balcao to app_rls;
alter table vendas_balcao enable row level security;
alter table vendas_balcao force row level security;
create policy tenant_isolamento on vendas_balcao to app_rls using (estabelecimento_id = app_eid()) with check (estabelecimento_id = app_eid());

grant select, insert, update, delete on itens_venda_balcao to app_rls;
alter table itens_venda_balcao enable row level security;
alter table itens_venda_balcao force row level security;
create policy tenant_isolamento on itens_venda_balcao to app_rls using (estabelecimento_id = app_eid()) with check (estabelecimento_id = app_eid());

grant select, insert, update, delete on pagamentos_venda_balcao to app_rls;
alter table pagamentos_venda_balcao enable row level security;
alter table pagamentos_venda_balcao force row level security;
create policy tenant_isolamento on pagamentos_venda_balcao to app_rls using (estabelecimento_id = app_eid()) with check (estabelecimento_id = app_eid());

grant select, insert, update, delete on movimentos_estoque to app_rls;
alter table movimentos_estoque enable row level security;
alter table movimentos_estoque force row level security;
create policy tenant_isolamento on movimentos_estoque to app_rls using (estabelecimento_id = app_eid()) with check (estabelecimento_id = app_eid());

grant select, insert, update, delete on documentos_fiscais to app_rls;
alter table documentos_fiscais enable row level security;
alter table documentos_fiscais force row level security;
create policy tenant_isolamento on documentos_fiscais to app_rls using (estabelecimento_id = app_eid()) with check (estabelecimento_id = app_eid());

commit;
