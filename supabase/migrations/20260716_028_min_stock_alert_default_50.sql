-- ============================================================
-- Donna FIT — Aumenta o padrão de alerta de baixo estoque (10 -> 50)
-- Migration: 20260716_028_min_stock_alert_default_50.sql
-- Apply AFTER 20260716_027_individual_stock_type_rename.sql
--
-- Pedido do cliente: o limiar de "baixo estoque" (min_stock_alert) estava
-- em 10 marmitas por padrão (DEFAULT da coluna, 20260602_001) para quase
-- todo o cardápio — passa a ser 50. Só os produtos que ainda estão no
-- valor padrão antigo (10) são atualizados; produtos com um valor
-- diferente já customizado manualmente (ex: combos em 5) não são tocados.
-- ============================================================

ALTER TABLE public.products ALTER COLUMN min_stock_alert SET DEFAULT 50;

UPDATE public.products SET min_stock_alert = 50 WHERE min_stock_alert = 10;
