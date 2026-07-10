-- ============================================================
-- Donna FIT — Desconto do PIX configurável (era 5% fixo no código)
-- Migration: 20260710_021_pix_discount_rate.sql
--
-- Some ao store_settings pra ficar editável em Configurações, mesmo
-- padrão de open_hour/close_hour. Desconto muda de 5% pra 2% (valor
-- inicial pedido pelo cliente).
-- ============================================================

alter table public.store_settings
  add column if not exists pix_discount_rate numeric(5,4) not null default 0.02;

update public.store_settings set pix_discount_rate = 0.02 where id = 'default';
