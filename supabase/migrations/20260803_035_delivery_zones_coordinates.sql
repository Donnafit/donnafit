-- ============================================================
-- Donna FIT — Coordenadas das zonas de entrega
-- Migration: 20260803_035_delivery_zones_coordinates.sql
--
-- Permite calcular a zona mais próxima (por distância) quando o endereço
-- do cliente não bate com nenhum bairro cadastrado em delivery_zones — em
-- vez de simplesmente recusar o pedido, usa a taxa da zona geograficamente
-- mais próxima só para o cálculo do frete. Populado por
-- scripts/geocode-delivery-zones.mjs (não faz parte desta migration —
-- consulta o Nominatim, que tem limite de request e não deve rodar em SQL).
-- ============================================================

alter table public.delivery_zones
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6);
