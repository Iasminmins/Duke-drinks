alter table movimentos_estoque
  add column if not exists motivo text not null default 'outro';

update movimentos_estoque
set motivo = 'venda_balcao'
where venda_id is not null and motivo = 'outro';
