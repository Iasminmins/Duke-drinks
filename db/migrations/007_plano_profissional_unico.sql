-- Remove o plano Essencial, que não faz parte da oferta comercial.
alter table tenants alter column plano set default 'profissional';
update tenants set plano = 'profissional' where plano = 'essencial';
