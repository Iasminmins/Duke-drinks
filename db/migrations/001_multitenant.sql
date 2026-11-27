-- 001_multitenant.sql
-- Transforma o banco single-tenant (só o Duke) em multi-tenant (vários bares/restaurantes).
--
-- Como o isolamento funciona:
--   * toda tabela de negócio ganha estabelecimento_id (default = app_eid(), então os INSERTs do código
--     continuam iguais)
--   * cada requisição roda numa transação com  set_config('app.eid', <id>, true)  e  set local role app_rls
--   * app_rls NÃO tem bypassrls, então as policies de RLS filtram tudo pelo app.eid
--   * FKs compostas (estabelecimento_id, id) impedem um negócio de apontar para registro de outro
--
-- Roda uma vez só, inteira numa transação. O Duke vira o tenant 'est_duke' (slug 'duke').

begin;

-- ---------------------------------------------------------------- plataforma (sem RLS, só o servidor lê)
create table tenants (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  tipo text not null default 'bar'
    check (tipo in ('bar','restaurante','hamburgueria','lanchonete','pizzaria','cafeteria','outro')),
  plano text not null default 'profissional',
  status text not null default 'trial' check (status in ('trial','ativo','suspenso','cancelado')),
  trial_ate timestamptz,
  pago_ate timestamptz,
  responsavel_nome text,
  responsavel_email text,
  responsavel_celular text,
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

insert into tenants (id, slug, tipo, plano, status, responsavel_nome)
select id, 'duke', 'bar', 'profissional', 'ativo', nome from estabelecimento;

create or replace function app_eid() returns text
language sql stable as $$ select nullif(current_setting('app.eid', true), '') $$;

-- ---------------------------------------------------------------- estabelecimento (config de cada negócio)
alter table estabelecimento
  add constraint estabelecimento_tenant_fk foreign key (id) references tenants(id) on delete cascade,
  add column cor_primaria text not null default '#f5b800' check (cor_primaria ~ '^#[0-9a-fA-F]{6}$'),
  add column proximo_pedido integer not null default 101;

update estabelecimento set proximo_pedido = coalesce((select max(numero) + 1 from pedidos), 101);

-- ---------------------------------------------------------------- estabelecimento_id em tudo
do $$
declare
  t text;
  tabelas text[] := array['usuarios','setores','categorias','adicionais','produtos','produto_adicionais',
                          'mesas','caixas','comandas','pedidos','itens_pedido','item_adicionais','pagamentos'];
  duke text := (select id from estabelecimento limit 1);
begin
  foreach t in array tabelas loop
    execute format('alter table %I add column estabelecimento_id text', t);
    execute format('update %I set estabelecimento_id = %L', t, duke);
    execute format('alter table %I alter column estabelecimento_id set not null', t);
    execute format('alter table %I alter column estabelecimento_id set default app_eid()', t);
    execute format('alter table %I add constraint %I foreign key (estabelecimento_id) references tenants(id) on delete cascade',
                   t, t || '_tenant_fk');
    execute format('create index %I on %I (estabelecimento_id)', t || '_eid_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- unicidades passam a ser por negócio
drop index usuarios_login_uq;
create unique index usuarios_login_uq on usuarios (estabelecimento_id, lower(login));

alter table setores drop constraint setores_slug_key;
create unique index setores_slug_uq on setores (estabelecimento_id, slug);

alter table mesas drop constraint mesas_numero_key;
create unique index mesas_numero_uq on mesas (estabelecimento_id, numero);

drop index caixas_um_aberto_uq;
create unique index caixas_um_aberto_uq on caixas (estabelecimento_id) where fechado_em is null;

drop index comandas_numero_ativo_uq;
create unique index comandas_numero_ativo_uq on comandas (estabelecimento_id, numero)
  where status in ('aberta','aguardando_pagamento');

-- número do pedido: contador por negócio (trigger), não mais a sequence global
alter table pedidos drop constraint pedidos_numero_key;
alter table pedidos alter column numero drop default;
create unique index pedidos_numero_uq on pedidos (estabelecimento_id, numero);
drop sequence pedido_numero_seq;

create or replace function pedidos_proximo_numero() returns trigger
language plpgsql as $$
begin
  if new.numero is null then
    update estabelecimento set proximo_pedido = proximo_pedido + 1
     where id = new.estabelecimento_id
     returning proximo_pedido - 1 into new.numero;
    if new.numero is null then
      raise exception 'estabelecimento % não encontrado', new.estabelecimento_id;
    end if;
  end if;
  return new;
end $$;

create trigger pedidos_numero_trg before insert on pedidos
  for each row execute function pedidos_proximo_numero();

-- ---------------------------------------------------------------- FKs compostas (sem referência entre negócios)
do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tabela
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid <> 'tenants'::regclass
      and c.conrelid::regclass::text in ('setores','categorias','adicionais','produtos','produto_adicionais','mesas',
            'caixas','comandas','pedidos','itens_pedido','item_adicionais','pagamentos','usuarios')
  loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
  end loop;
end $$;

alter table usuarios   add constraint usuarios_eid_id_uq   unique (estabelecimento_id, id);
alter table setores    add constraint setores_eid_id_uq    unique (estabelecimento_id, id);
alter table categorias add constraint categorias_eid_id_uq unique (estabelecimento_id, id);
alter table adicionais add constraint adicionais_eid_id_uq unique (estabelecimento_id, id);
alter table produtos   add constraint produtos_eid_id_uq   unique (estabelecimento_id, id);
alter table mesas      add constraint mesas_eid_id_uq      unique (estabelecimento_id, id);
alter table caixas     add constraint caixas_eid_id_uq     unique (estabelecimento_id, id);
alter table comandas   add constraint comandas_eid_id_uq   unique (estabelecimento_id, id);
alter table pedidos    add constraint pedidos_eid_id_uq    unique (estabelecimento_id, id);
alter table itens_pedido add constraint itens_pedido_eid_id_uq unique (estabelecimento_id, id);

alter table produtos
  add foreign key (estabelecimento_id, categoria_id) references categorias (estabelecimento_id, id),
  add foreign key (estabelecimento_id, setor_id) references setores (estabelecimento_id, id);

alter table produto_adicionais
  add foreign key (estabelecimento_id, produto_id) references produtos (estabelecimento_id, id) on delete cascade,
  add foreign key (estabelecimento_id, adicional_id) references adicionais (estabelecimento_id, id) on delete cascade;

alter table caixas
  add foreign key (estabelecimento_id, aberto_por) references usuarios (estabelecimento_id, id),
  add foreign key (estabelecimento_id, fechado_por) references usuarios (estabelecimento_id, id);

alter table comandas
  add foreign key (estabelecimento_id, mesa_id) references mesas (estabelecimento_id, id),
  add foreign key (estabelecimento_id, aberta_por) references usuarios (estabelecimento_id, id),
  add foreign key (estabelecimento_id, fechada_por) references usuarios (estabelecimento_id, id);

alter table pedidos
  add foreign key (estabelecimento_id, comanda_id) references comandas (estabelecimento_id, id);

alter table itens_pedido
  add foreign key (estabelecimento_id, pedido_id) references pedidos (estabelecimento_id, id) on delete cascade,
  add foreign key (estabelecimento_id, produto_id) references produtos (estabelecimento_id, id),
  add foreign key (estabelecimento_id, setor_id) references setores (estabelecimento_id, id);

alter table item_adicionais
  add foreign key (estabelecimento_id, item_id) references itens_pedido (estabelecimento_id, id) on delete cascade,
  add foreign key (estabelecimento_id, adicional_id) references adicionais (estabelecimento_id, id)
    on delete set null (adicional_id);

alter table pagamentos
  add foreign key (estabelecimento_id, comanda_id) references comandas (estabelecimento_id, id),
  add foreign key (estabelecimento_id, caixa_id) references caixas (estabelecimento_id, id),
  add foreign key (estabelecimento_id, usuario_id) references usuarios (estabelecimento_id, id),
  add foreign key (estabelecimento_id, estornado_por) references usuarios (estabelecimento_id, id);

-- ---------------------------------------------------------------- papel da aplicação + RLS
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_rls') then
    create role app_rls nologin nobypassrls;
  end if;
end $$;
grant app_rls to current_user;

grant usage on schema public to app_rls;
grant select, insert, update, delete on all tables in schema public to app_rls;
revoke all on tenants from app_rls;
grant usage, select on all sequences in schema public to app_rls;
alter default privileges in schema public grant select, insert, update, delete on tables to app_rls;
alter default privileges in schema public grant usage, select on sequences to app_rls;

alter table estabelecimento enable row level security;
alter table estabelecimento force row level security;
create policy tenant_isolamento on estabelecimento to app_rls
  using (id = app_eid()) with check (id = app_eid());

do $$
declare
  t text;
  tabelas text[] := array['usuarios','setores','categorias','adicionais','produtos','produto_adicionais',
                          'mesas','caixas','comandas','pedidos','itens_pedido','item_adicionais','pagamentos'];
begin
  foreach t in array tabelas loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy tenant_isolamento on %I to app_rls
                      using (estabelecimento_id = app_eid()) with check (estabelecimento_id = app_eid())', t);
  end loop;
end $$;

commit;
