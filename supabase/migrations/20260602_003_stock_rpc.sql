-- ============================================================
-- Donna FIT — Stock RPCs
-- Migration: 20260602_003_stock_rpc.sql
-- Apply AFTER 20260602_001_initial_schema.sql
-- ============================================================

-- reserve_stock: deducts freezer stock at checkout (combo items)
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_product_id UUID,
  p_quantity   INT,
  p_order_id   UUID
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_product_id AND stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente para o produto %', p_product_id;
  END IF;

  INSERT INTO public.stock_movements(product_id, type, quantity, reference_id)
  VALUES (p_product_id, 'reservation', -p_quantity, p_order_id);
END;
$$;

-- deduct_stock: called when admin moves order to production (avulso items)
CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_product_id UUID,
  p_quantity   INT,
  p_order_id   UUID
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;

  INSERT INTO public.stock_movements(product_id, type, quantity, reference_id)
  VALUES (p_product_id, 'deduction', -p_quantity, p_order_id);
END;
$$;

-- adjust_stock: called from freezer count screen (Patricia's manual count)
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id    UUID,
  p_new_quantity  INT,
  p_notes         TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old   INT;
  v_delta INT;
BEGIN
  SELECT stock_quantity INTO v_old FROM public.products WHERE id = p_product_id;
  v_delta := p_new_quantity - v_old;

  UPDATE public.products
  SET stock_quantity = p_new_quantity
  WHERE id = p_product_id;

  INSERT INTO public.stock_movements(product_id, type, quantity, notes, created_by)
  VALUES (p_product_id, 'adjustment', v_delta, p_notes, auth.uid());
END;
$$;
