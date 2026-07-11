-- ============================================================
-- Donna FIT — Endereço de retirada (não existia em lugar nenhum do sistema)
-- Migration: 20260710_023_pickup_address.sql
--
-- Mensagem do WhatsApp de pedidos "Retirada na loja" nunca mostrava
-- endereço nenhum porque essa informação simplesmente não existia no
-- banco. Some ao store_settings, editável em Configurações.
-- ============================================================

alter table public.store_settings
  add column if not exists pickup_address text default '';

update public.store_settings
  set pickup_address = 'Rua Charles Dickens, 337, Abranches, Curitiba - PR, 82220-305'
  where id = 'default';
