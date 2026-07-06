-- ============================================================
-- Donna FIT — Rota de Entrega
-- Adds 'out_for_delivery' status: order left for delivery,
-- sits between 'ready' (liberado/balcão) and 'delivered'.
-- ============================================================

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','production','ready','out_for_delivery','delivered','cancelled'));
