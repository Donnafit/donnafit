-- ============================================================
-- Donna FIT — Initial Schema
-- Migration: 20260602_001_initial_schema.sql
-- Apply via: Supabase Dashboard → SQL Editor → paste and Run
-- ============================================================

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE public.categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUCTS (marmitas)
-- ============================================================
CREATE TABLE public.products (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id      UUID          REFERENCES public.categories(id) ON DELETE SET NULL,
  sku              TEXT          UNIQUE,
  name             TEXT          NOT NULL,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL,
  image_url        TEXT,
  stock_type       TEXT          NOT NULL DEFAULT 'avulso'
                                 CHECK (stock_type IN ('combo', 'avulso')),
  stock_quantity   INT           NOT NULL DEFAULT 0,
  min_stock_alert  INT           NOT NULL DEFAULT 10,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  sort_order       INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT now(),
  updated_at       TIMESTAMPTZ   DEFAULT now()
);

-- ============================================================
-- ORDER SEQUENCE — generates #DF0001, #DF0002, etc.
-- ============================================================
CREATE SEQUENCE public.order_number_seq START 1;

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE public.orders (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number    TEXT          NOT NULL UNIQUE
                                DEFAULT 'DF' || LPAD(nextval('order_number_seq')::TEXT, 4, '0'),
  customer_name   TEXT          NOT NULL,
  customer_phone  TEXT          NOT NULL,
  delivery_type   TEXT          NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
  payment_method  TEXT          NOT NULL CHECK (payment_method IN ('pix', 'card')),
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','production','ready','delivered','cancelled')),
  subtotal        NUMERIC(10,2) NOT NULL,
  total           NUMERIC(10,2) NOT NULL,
  notes           TEXT,
  delivery_date   DATE,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE public.order_items (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID          REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT          NOT NULL,
  product_sku   TEXT,
  quantity      INT           NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL,
  subtotal      NUMERIC(10,2) NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- STOCK MOVEMENTS (audit trail)
-- ============================================================
CREATE TABLE public.stock_movements (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL
               CHECK (type IN ('reservation','deduction','adjustment','restock','cancellation')),
  quantity     INT         NOT NULL,
  reference_id UUID,
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name  TEXT,
  role       TEXT        NOT NULL DEFAULT 'staff'
             CHECK (role IN ('admin', 'kitchen', 'staff')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
