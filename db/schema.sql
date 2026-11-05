-- Duke | Drinks e Choperia — esquema do banco (Neon Postgres 17)
-- Projeto Neon: duke-drinks (id cold-hill-06877865, região aws-sa-east-1)
-- Já aplicado no Neon. Este arquivo é a referência versionada do esquema.
--
-- Acesso: SOMENTE pelo servidor (API). Nunca exponha a connection string no navegador.
-- Senhas: bcrypt via pgcrypto (crypt/gen_salt). Troque a senha demo "duke123" antes de produção.

create extension if not exists pgcrypto;

create table estabelecimento (
  id text primary key,
  nome text not null,
  logo_url text,
  taxa_servico_padrao numeric(5,2) not null default 10 check (taxa_servico_padrao between 0 and 100),
  horario_funcionamento text not null default '',
  mensagem_topo text not null default '',
  endereco text not null default ''
);

create table usuarios (
  id text primary key default gen_random_uuid()::text,
  nome text not null check (length(trim(nome)) >= 2),
  papel text not null check (papel in ('admin','caixa','garcom','cozinha','bar')),
  ativo boolean not null default true,
  login text not null check (login ~ '^[A-Za-z0-9._-]{3,}$'),
  senha_hash text not null,
  criado_em timestamptz not null default now()
);
create unique index usuarios_login_uq on usuarios (lower(login));

create table setores (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  slug text not null unique,
  seq bigint generated always as identity
);

create table categorias (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  ordem integer not null default 0,
  ativa boolean not null default true
);

create table adicionais (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  preco numeric(10,2) not null default 0 check (preco >= 0),
  seq bigint generated always as identity
);

create table produtos (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  descricao text not null default '',
  preco numeric(10,2) not null check (preco >= 0),
  categoria_id text not null references categorias(id),
  setor_id text not null references setores(id),
  imagem_url text,
  esgotado boolean not null default false,
  ativo boolean not null default true,
  destaque boolean not null default false,
  seq bigint generated always as identity -- ordem de cadastro (ordem do cardápio dentro da categoria)
);
create index produtos_categoria_idx on produtos (categoria_id);

create table produto_adicionais (
  produto_id text not null references produtos(id) on delete cascade,
  adicional_id text not null references adicionais(id) on delete cascade,
  primary key (produto_id, adicional_id)
);

create table mesas (
  id text primary key default gen_random_uuid()::text,
  numero integer not null unique check (numero > 0),
  lugares integer not null default 4 check (lugares > 0),
  ativa boolean not null default true
);

create table caixas (
  id text primary key default gen_random_uuid()::text,
  aberto_por text not null references usuarios(id),
  aberto_em timestamptz not null default now(),
  fundo_inicial numeric(10,2) not null default 0 check (fundo_inicial >= 0),
  fechado_em timestamptz,
  fechado_por text references usuarios(id),
  valores_contados jsonb
);
-- só pode existir um caixa aberto por vez
create unique index caixas_um_aberto_uq on caixas ((true)) where fechado_em is null;

-- Uma mesa pode ter várias comandas ativas (comandas individuais).
-- O código de 4 dígitos identifica a comanda dentro da mesa, por isso é único entre as ativas.
create table comandas (
  id text primary key default gen_random_uuid()::text,
  mesa_id text not null references mesas(id),
  codigo char(4) not null check (codigo ~ '^[0-9]{4}$'),
  status text not null default 'aberta' check (status in ('aberta','aguardando_pagamento','fechada','cancelada')),
  aberta_em timestamptz not null default now(),
  aberta_por text not null references usuarios(id),
  fechada_em timestamptz,
  fechada_por text references usuarios(id),
  cobrar_taxa_servico boolean not null default true,
  desconto numeric(10,2) not null default 0 check (desconto >= 0),
  chamando_garcom boolean not null default false,
  chamado_em timestamptz,
  cliente_nome text,
  cliente_celular text check (cliente_celular is null or cliente_celular ~ '^[0-9]{10,11}$')
);
create index comandas_mesa_idx on comandas (mesa_id);
create index comandas_status_idx on comandas (status);
create unique index comandas_codigo_ativo_uq on comandas (mesa_id, codigo)
  where status in ('aberta','aguardando_pagamento');

create sequence pedido_numero_seq start 101;

create table pedidos (
  id text primary key default gen_random_uuid()::text,
  numero integer not null unique default nextval('pedido_numero_seq'),
  comanda_id text not null references comandas(id),
  origem text not null check (origem in ('cliente','garcom')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index pedidos_comanda_idx on pedidos (comanda_id);

create table itens_pedido (
  id text primary key default gen_random_uuid()::text,
  pedido_id text not null references pedidos(id) on delete cascade,
  produto_id text not null references produtos(id),
  nome text not null,
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  quantidade integer not null check (quantidade between 1 and 50),
  observacao text,
  setor_id text not null references setores(id),
  status text not null default 'recebido' check (status in ('recebido','preparando','pronto','entregue','cancelado')),
  seq bigint generated always as identity -- mantém a ordem dos itens no pedido
);
create index itens_pedido_pedido_idx on itens_pedido (pedido_id);
create index itens_pedido_setor_status_idx on itens_pedido (setor_id, status);
create index itens_pedido_seq_idx on itens_pedido (pedido_id, seq);

create table item_adicionais (
  id bigint generated always as identity primary key,
  item_id text not null references itens_pedido(id) on delete cascade,
  adicional_id text references adicionais(id) on delete set null,
  nome text not null,
  preco numeric(10,2) not null default 0
);
create index item_adicionais_item_idx on item_adicionais (item_id);

create table pagamentos (
  id text primary key default gen_random_uuid()::text,
  comanda_id text not null references comandas(id),
  caixa_id text not null references caixas(id),
  forma text not null check (forma in ('dinheiro','pix','debito','credito','outro')),
  valor numeric(10,2) not null check (valor > 0),
  valor_recebido numeric(10,2),
  troco numeric(10,2),
  usuario_id text not null references usuarios(id),
  criado_em timestamptz not null default now(),
  estornado boolean not null default false,
  motivo_estorno text,
  estornado_por text references usuarios(id),
  estornado_em timestamptz
);
create index pagamentos_comanda_idx on pagamentos (comanda_id);
create index pagamentos_caixa_idx on pagamentos (caixa_id);
