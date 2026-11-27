begin;

create table if not exists grupos_estabelecimentos (
  id text primary key,
  nome text not null,
  criado_em timestamptz not null default now()
);

alter table tenants add column if not exists grupo_id text;

insert into grupos_estabelecimentos (id, nome)
select 'grp_' || id, coalesce(responsavel_nome, slug)
from tenants where grupo_id is null
on conflict (id) do nothing;

update tenants set grupo_id = 'grp_' || id where grupo_id is null;

alter table tenants alter column grupo_id set not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_grupo_id_fkey' and conrelid = 'tenants'::regclass
  ) then
    alter table tenants add constraint tenants_grupo_id_fkey
      foreign key (grupo_id) references grupos_estabelecimentos(id) on delete restrict;
  end if;
end $$;

create index if not exists tenants_grupo_id_idx on tenants(grupo_id);

commit;
