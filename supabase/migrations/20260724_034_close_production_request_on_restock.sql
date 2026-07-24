-- ============================================================
-- Donna FIT — fecha pedido de produção pendente ao reabastecer estoque
-- Migration: 20260724_034_close_production_request_on_restock.sql
-- Apply AFTER 20260717_030_adjust_rice_stock_rpc.sql
--
-- Bug: production_requests (migration 029) só é fechado manualmente pelo
-- botão "Concluído" da aba Cozinha (POST /api/kitchen/requests/[id]/complete).
-- Quando o estoque é reabastecido pelo painel de Estoque (RPC adjust_stock/
-- adjust_rice_stock) em vez desse botão, o pedido pendente nunca é tocado
-- e fica órfão na lista da cozinha para sempre — foi o caso relatado do
-- "Frango Xadrez".
--
-- Fix: quando o estoque sobe (v_delta > 0) via essas RPCs, fecha também
-- qualquer production_request 'pending' daquele produto. actual_quantity
-- é gravado como o delta reabastecido — se houver mais de um pedido
-- pendente pro mesmo produto (caso raro), todos são fechados com o mesmo
-- delta, já que o painel de Estoque não distingue quantidade por pedido.
-- ============================================================

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

  IF v_delta > 0 THEN
    UPDATE public.production_requests
    SET status = 'completed', actual_quantity = v_delta, completed_at = now()
    WHERE product_id = p_product_id AND status = 'pending';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_rice_stock(
  p_product_id    UUID,
  p_rice_type     TEXT,
  p_new_quantity  INT,
  p_notes         TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old   INT;
  v_delta INT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Acesso negado: apenas equipe pode ajustar estoque';
  END IF;

  IF p_rice_type = 'integral' THEN
    SELECT rice_stock_integral INTO v_old FROM public.products WHERE id = p_product_id;
    v_delta := p_new_quantity - COALESCE(v_old, 0);
    UPDATE public.products SET rice_stock_integral = p_new_quantity WHERE id = p_product_id;
  ELSIF p_rice_type = 'branco' THEN
    SELECT rice_stock_branco INTO v_old FROM public.products WHERE id = p_product_id;
    v_delta := p_new_quantity - COALESCE(v_old, 0);
    UPDATE public.products SET rice_stock_branco = p_new_quantity WHERE id = p_product_id;
  ELSE
    RAISE EXCEPTION 'Tipo de arroz inválido: %', p_rice_type;
  END IF;

  INSERT INTO public.stock_movements(product_id, type, quantity, notes, created_by)
  VALUES (p_product_id, 'adjustment', v_delta, COALESCE(p_notes, 'Ajuste manual') || ' — arroz: ' || p_rice_type, auth.uid());

  IF v_delta > 0 THEN
    UPDATE public.production_requests
    SET status = 'completed', actual_quantity = v_delta, completed_at = now()
    WHERE product_id = p_product_id AND status = 'pending';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_rice_stock(UUID, TEXT, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_rice_stock(UUID, TEXT, INT, TEXT) TO authenticated;
