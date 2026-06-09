-- ============================================================
-- Donna FIT — RLS Policies
-- Migration: 20260602_002_rls_policies.sql
-- Apply AFTER 20260602_001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS FOR RLS (Prevents infinite recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CATEGORIES: public read, admin write
-- ============================================================
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- PRODUCTS: anon reads active only, auth reads all, admin writes
-- ============================================================
DROP POLICY IF EXISTS "products_anon_read_active" ON public.products;
CREATE POLICY "products_anon_read_active"
  ON public.products FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "products_auth_read_all" ON public.products;
CREATE POLICY "products_auth_read_all"
  ON public.products FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write"
  ON public.products FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- ORDERS: anon can insert, authenticated can read + update
-- ============================================================
DROP POLICY IF EXISTS "orders_anon_insert" ON public.orders;
CREATE POLICY "orders_anon_insert"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "orders_auth_read" ON public.orders;
CREATE POLICY "orders_auth_read"
  ON public.orders FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "orders_auth_update" ON public.orders;
CREATE POLICY "orders_auth_update"
  ON public.orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- ORDER ITEMS: anon insert (with order), auth read
-- ============================================================
DROP POLICY IF EXISTS "order_items_anon_insert" ON public.order_items;
CREATE POLICY "order_items_anon_insert"
  ON public.order_items FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_auth_read" ON public.order_items;
CREATE POLICY "order_items_auth_read"
  ON public.order_items FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- STOCK MOVEMENTS: authenticated only (all operations)
-- ============================================================
DROP POLICY IF EXISTS "stock_movements_auth_all" ON public.stock_movements;
CREATE POLICY "stock_movements_auth_all"
  ON public.stock_movements FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- PROFILES: own read/update, admin reads all
-- ============================================================
DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
CREATE POLICY "profiles_own_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_read_all" ON public.profiles;
CREATE POLICY "profiles_admin_read_all"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
CREATE POLICY "profiles_own_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
