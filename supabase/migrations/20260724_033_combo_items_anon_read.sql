-- ============================================================
-- Donna FIT — leitura pública da composição de combos
-- Migration: 20260724_033_combo_items_anon_read.sql
-- Apply AFTER 20260723_032_combo_marmitas_count.sql
--
-- combo_items só tinha RLS para "authenticated" (migration 026) —
-- decisão da migration 032 foi não expor a composição pro storefront
-- anônimo e só materializar a CONTAGEM em combo_marmitas_count. Agora
-- o cardápio público precisa exibir também QUAIS marmitas compõem
-- cada combo (nome + quantidade), então passamos a permitir leitura
-- anônima — restrita a combos ativos, mesmo critério de
-- "products_anon_read_active".
-- ============================================================

DROP POLICY IF EXISTS "combo_items_anon_read" ON public.combo_items;
CREATE POLICY "combo_items_anon_read"
  ON public.combo_items FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = combo_items.combo_product_id
        AND products.is_active = true
    )
  );
