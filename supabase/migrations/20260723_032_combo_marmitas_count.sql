-- ============================================================
-- Donna FIT — combo_marmitas_count (contagem real de marmitas por combo)
-- Migration: 20260723_032_combo_marmitas_count.sql
-- Apply AFTER 20260717_031_ingredient_catalog.sql
--
-- Bug: o mínimo de frete (8 marmitas) e os contadores de carrinho
-- tratavam cada item do carrinho como 1 unidade, mesmo quando o item é
-- um combo com várias marmitas dentro (combo_items). Ex.: "1x Combo de
-- 10 Marmitas" no carrinho contava como 1, não como 10.
--
-- combo_items tem RLS restrita a authenticated (produtos, por outro
-- lado, já são públicos) — em vez de expor combo_items pro storefront
-- anônimo, materializamos a soma em products.combo_marmitas_count,
-- mantida em sincronia por trigger sempre que combo_items muda.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS combo_marmitas_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_combo_marmitas_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  affected_combo_id UUID;
BEGIN
  affected_combo_id := COALESCE(NEW.combo_product_id, OLD.combo_product_id);
  UPDATE public.products
  SET combo_marmitas_count = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM public.combo_items
    WHERE combo_product_id = affected_combo_id
  )
  WHERE id = affected_combo_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_combo_marmitas_count ON public.combo_items;
CREATE TRIGGER trg_sync_combo_marmitas_count
  AFTER INSERT OR UPDATE OR DELETE ON public.combo_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_combo_marmitas_count();

-- Backfill dos combos já cadastrados.
UPDATE public.products p
SET combo_marmitas_count = sub.total
FROM (
  SELECT combo_product_id, SUM(quantity) AS total
  FROM public.combo_items
  GROUP BY combo_product_id
) sub
WHERE p.id = sub.combo_product_id;
