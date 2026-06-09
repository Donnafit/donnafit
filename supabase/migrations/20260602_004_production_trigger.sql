-- ============================================================
-- Donna FIT — Kanban Production Trigger
-- Migration: 20260602_004_production_trigger.sql
-- Apply AFTER 20260602_003_stock_rpc.sql
-- ============================================================

-- Function to automatically loop and deduct stock for avulso items 
-- when an order transitions to 'production' status.
CREATE OR REPLACE FUNCTION public.handle_order_production_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item record;
BEGIN
  -- Execute only when status is changed to 'production'
  IF NEW.status = 'production' AND (OLD.status IS NULL OR OLD.status <> 'production') THEN
    FOR v_item IN 
      SELECT oi.product_id, oi.quantity 
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id AND p.stock_type = 'avulso'
    LOOP
      PERFORM public.deduct_stock(v_item.product_id, v_item.quantity, NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS on_order_status_production ON public.orders;
CREATE TRIGGER on_order_status_production
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_production_stock();
