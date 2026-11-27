create table if not exists solicitacoes_estabelecimentos (
  id text primary key default gen_random_uuid()::text,
  tenant_id text not null references tenants(id) on delete cascade,
  quantidade integer not null check (quantidade between 1 and 20),
  valor_mensal numeric(12,2) not null check (valor_mensal > 0),
  status text not null default 'pendente' check (status in ('pendente','em_contato','resolvida')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  resolvido_em timestamptz
);

create unique index if not exists solicitacoes_estabelecimentos_pendente_uq
  on solicitacoes_estabelecimentos (tenant_id) where status = 'pendente';
create index if not exists solicitacoes_estabelecimentos_status_idx
  on solicitacoes_estabelecimentos (status, criado_em desc);
