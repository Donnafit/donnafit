-- ============================================================
-- Donna FIT — RPC de ajuste manual do estoque por tipo de arroz
-- Migration: 20260717_030_adjust_rice_stock_rpc.sql
--
-- adjust_stock (migration 015) só sabe mexer em stock_quantity. Produtos
-- com rice_stock_mode = 'both' guardam o estoque real em
-- rice_stock_integral/rice_stock_branco (migration 026) e nunca em
-- stock_quantity — sem essa RPC, o painel Estoque não tinha como ajustar
-- esses dois números fora do modal de edição completo (digitar valor
-- absoluto), sem stepper +/- nem persistência de stock_movements como o
-- resto do estoque tem.
--
-- Mesmo padrão de segurança do adjust_stock: SECURITY DEFINER com
-- is_staff() checado internamente (não um REVOKE cego), porque é chamada
-- direto do browser com a anon key pelo painel admin.
-- ============================================================

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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_rice_stock(UUID, TEXT, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_rice_stock(UUID, TEXT, INT, TEXT) TO authenticated;
