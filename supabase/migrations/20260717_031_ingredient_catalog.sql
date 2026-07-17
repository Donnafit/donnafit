-- ============================================================
-- Donna FIT — Catálogo de ingredientes + composição por produto
-- Migration: 20260717_031_ingredient_catalog.sql
--
-- Substitui o textarea livre "Ingredientes" (products.description) por uma
-- lista estruturada de nome + quantidade + unidade, reaproveitável entre
-- produtos via um catálogo. Mesmo padrão relacional de combo_items
-- (migration 20260716_026): tabela de catálogo + tabela de ligação,
-- apagando e reinserindo a cada save (ver ProductModal/ManualClient).
--
-- products.description é preservado como coluna (continua sendo o que o
-- site lê em ProductCard/produto/[id]/CatalogClient/CheckoutForm) mas
-- passa a ser gerado automaticamente a partir desta lista sempre que ela
-- não estiver vazia — ver src/lib/productIngredients.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ingredients (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_ingredients (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id    UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id UUID        NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity      NUMERIC     NOT NULL CHECK (quantity > 0),
  unit          TEXT        NOT NULL DEFAULT 'g',
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_ingredients_unique UNIQUE (product_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON public.product_ingredients(product_id);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer staff logado (precisa listar o catálogo e a composição
-- no cadastro de produto e no Manual de Preparo) — mesmo padrão de
-- combo_items_auth_read. Escrita: is_staff(), mesmo nível de
-- products_admin_write (migration 015) — quem já edita produto/modo de
-- preparo também cadastra ingrediente.
DROP POLICY IF EXISTS "ingredients_auth_read" ON public.ingredients;
CREATE POLICY "ingredients_auth_read"
  ON public.ingredients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ingredients_staff_write" ON public.ingredients;
CREATE POLICY "ingredients_staff_write"
  ON public.ingredients FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "product_ingredients_auth_read" ON public.product_ingredients;
CREATE POLICY "product_ingredients_auth_read"
  ON public.product_ingredients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "product_ingredients_staff_write" ON public.product_ingredients;
CREATE POLICY "product_ingredients_staff_write"
  ON public.product_ingredients FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
