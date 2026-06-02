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
-- CATEGORIES: public read, admin write
-- ============================================================
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "categories_admin_write"
  ON public.categories FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PRODUCTS: anon reads active only, auth reads all, admin writes
-- ============================================================
CREATE POLICY "products_anon_read_active"
  ON public.products FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "products_auth_read_all"
  ON public.products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "products_admin_write"
  ON public.products FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- ORDERS: anon can insert, authenticated can read + update
-- ============================================================
CREATE POLICY "orders_anon_insert"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "orders_auth_read"
  ON public.orders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "orders_auth_update"
  ON public.orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- ORDER ITEMS: anon insert (with order), auth read
-- ============================================================
CREATE POLICY "order_items_anon_insert"
  ON public.order_items FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "order_items_auth_read"
  ON public.order_items FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- STOCK MOVEMENTS: authenticated only (all operations)
-- ============================================================
CREATE POLICY "stock_movements_auth_all"
  ON public.stock_movements FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- PROFILES: own read/update, admin reads all
-- ============================================================
CREATE POLICY "profiles_own_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_admin_read_all"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_own_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
