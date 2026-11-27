alter table vendas_balcao
  add column if not exists cancelado_em timestamptz,
  add column if not exists cancelado_por text,
  add column if not exists motivo_cancelamento text not null default '';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vendas_balcao_cancelado_por_fk'
      and conrelid = 'vendas_balcao'::regclass
  ) then
    alter table vendas_balcao
      add constraint vendas_balcao_cancelado_por_fk
      foreign key (estabelecimento_id, cancelado_por)
      references usuarios (estabelecimento_id, id);
  end if;
end $$;
