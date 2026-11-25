-- Sequencia global para codigos internos Code 39 gerados pelo Comandou.
-- Nao e um GTIN/EAN de fabricante; o prefixo CMD identifica o uso interno.

begin;
create sequence if not exists codigo_barras_interno_seq start 1;
grant usage, select on sequence codigo_barras_interno_seq to app_rls;
commit;
