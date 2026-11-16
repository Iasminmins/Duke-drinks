-- 002_cartoes.sql
-- Cartões de comanda numerados (os cartões físicos do salão).
-- O dono cadastra os números que existem (ex.: 1 a 100). Ao abrir uma comanda, o garçom escolhe um
-- número livre entre eles. Negócio sem cartões cadastrados continua com a numeração automática (1, 2, 3...).
-- Pode rodar mais de uma vez.

begin;

create table if not exists cartoes (
  estabelecimento_id text not null default app_eid() references tenants(id) on delete cascade,
  numero integer not null check (numero between 1 and 9999),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (estabelecimento_id, numero)
);

-- QR fixo impresso no cartão: aponta para /k/<token>. O token nunca muda; o cartão leva o cliente
-- para a comanda que estiver aberta naquele número no momento.
alter table cartoes add column if not exists token text not null default encode(gen_random_bytes(12), 'hex');
create unique index if not exists cartoes_token_uq on cartoes (token);

grant select, insert, update, delete on cartoes to app_rls;

alter table cartoes enable row level security;
alter table cartoes force row level security;
drop policy if exists tenant_isolamento on cartoes;
create policy tenant_isolamento on cartoes to app_rls
  using (estabelecimento_id = app_eid()) with check (estabelecimento_id = app_eid());

commit;
