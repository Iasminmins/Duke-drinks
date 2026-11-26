-- Impede duplicação de venda, pagamento e baixa de estoque quando o caixa repete
-- uma requisição após perder a resposta do servidor.
begin;

alter table vendas_balcao
  add column if not exists request_key uuid,
  add column if not exists request_hash text;

alter table pagamentos
  add column if not exists request_key uuid,
  add column if not exists request_hash text;

create unique index if not exists vendas_balcao_request_key_uq
  on vendas_balcao (estabelecimento_id, request_key)
  where request_key is not null;

create unique index if not exists pagamentos_request_key_uq
  on pagamentos (estabelecimento_id, request_key)
  where request_key is not null;

commit;
