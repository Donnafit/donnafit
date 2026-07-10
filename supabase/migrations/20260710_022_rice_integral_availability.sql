-- ============================================================
-- Donna FIT — Nem todo prato tem opção de arroz integral
-- Migration: 20260710_022_rice_integral_availability.sql
--
-- Alguns pratos só servem arroz branco (não têm versão integral no
-- cardápio real). O checkout usava a mesma pergunta Integral/Branco para
-- qualquer item com "arroz" na descrição — agora só pergunta quando o
-- prato realmente oferece as duas opções.
-- ============================================================

alter table public.products
  add column if not exists rice_integral_available boolean not null default true;

update public.products set rice_integral_available = false
  where id in (
    'd367e8f6-3f7e-4a44-8a8d-1d34dfe80d60', -- FEIJOADA
    '630fb468-7e79-4014-ab5e-c2672ad74e65', -- Estrogonofe De Frango Com Arroz e Batata Palha
    '997d6e8c-c2cb-4228-9901-1c6fb9a594e8', -- Estrogonofe De Carne Com Arroz e Batata Palha
    '194ffd00-cdb1-4676-9387-646445b75206'  -- Fricassê De Palmito Com Arroz Branco
  );
