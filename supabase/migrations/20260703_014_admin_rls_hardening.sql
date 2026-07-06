-- ============================================================
-- Donna FIT — Auth hardening before go-live
-- Apply AFTER 20260602_002_rls_policies.sql
--
-- Problem: orders/order_items/stock_movements only checked
-- "TO authenticated USING (true)" — any logged-in Supabase user,
-- including a customer who just signed up on the public storefront,
-- could read/write all orders and stock data. That's because new
-- profiles defaulted to role='staff', which reads as "trusted" but
-- was never actually gated on.
--
-- Fix:
-- 1. New signups default to role='customer' (no special access)
--    instead of 'staff'.
-- 2. is_staff() helper (admin OR kitchen) for operational tables
--    that both roles legitimately need (orders, order_items, stock).
-- 3. orders/order_items/stock_movements now require is_staff().
--
-- MANUAL STEP REQUIRED: audit existing rows in public.profiles via
-- Supabase Studio. Any row with role='staff' that is NOT actually
-- Everson/Patricia/kitchen staff should be changed to 'customer'.
-- This migration does not bulk-rewrite existing rows automatically
-- since it can't tell real staff from accidental defaults.
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'kitchen', 'staff', 'customer'));

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'customer';

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
  );
END;
$$ LANGUAGE plpgsql;

-- ORDERS
DROP POLICY IF EXISTS "orders_auth_read" ON public.orders;
CREATE POLICY "orders_auth_read"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "orders_auth_update" ON public.orders;
CREATE POLICY "orders_auth_update"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ORDER ITEMS
DROP POLICY IF EXISTS "order_items_auth_read" ON public.order_items;
CREATE POLICY "order_items_auth_read"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.is_staff());

-- STOCK MOVEMENTS
DROP POLICY IF EXISTS "stock_movements_auth_all" ON public.stock_movements;
CREATE POLICY "stock_movements_auth_all"
  ON public.stock_movements FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
