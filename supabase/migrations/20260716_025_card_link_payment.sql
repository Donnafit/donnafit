-- ============================================================
-- Donna FIT — Pagamento com link de cartão (novo método,
-- rotulagem apenas — sem integração de gateway)
-- Migration: 20260716_025_card_link_payment.sql
--
-- Libera "card_link" nas mesmas duas constraints que hoje só
-- aceitam 'pix' e 'card': orders.payment_method (forma de
-- pagamento gravada por pedido) e customer_profiles.preferred_payment
-- (última forma de pagamento usada pelo cliente, some no upsert
-- de perfil em api/orders/route.ts).
-- ============================================================

alter table public.orders
  drop constraint orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('pix', 'card', 'card_link'));

alter table public.customer_profiles
  drop constraint customer_profiles_preferred_payment_check;
alter table public.customer_profiles
  add constraint customer_profiles_preferred_payment_check
  check (preferred_payment in ('pix', 'card', 'card_link'));
