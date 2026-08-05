-- ============================================================
-- Donna FIT — Devolve estoque ao cancelar/excluir pedido
-- Migration: 20260805_036_restock_cancelled_orders.sql
-- Apply AFTER 20260803_035_delivery_zones_coordinates.sql
--
-- Problema: reserve_stock/reserve_rice_stock debitam o estoque uma
-- única vez, na criação do pedido (POST /api/orders). Quando o admin
-- cancela ou "exclui" um pedido (botão "Excluir pedido" em
-- OrderDetailPanel.tsx é só um alias de updateStatus(id, "cancelled")
-- — não existe DELETE real de orders liberado pra authenticated),
-- nada reverte essa baixa: o item some do pedido mas continua
-- descontado do freezer pra sempre.
--
-- Fix: trigger na própria tabela orders, disparado sempre que status
-- transiciona PARA 'cancelled' (de qualquer outro status), não
-- importa de onde o UPDATE veio (painel admin, rota de entrega,
-- futura API). Ele lê os movimentos 'reservation' registrados em
-- stock_movements para aquele pedido (reference_id = order.id —
-- já cobre combo, porque reserve_stock/reserve_rice_stock são
-- chamados por componente, um movimento por componente) e devolve a
-- mesma quantidade, mirando rice_stock_integral/branco quando a nota
-- indica reserva de arroz, ou stock_quantity nos demais casos.
--
-- Idempotência: se o pedido já tiver um movimento 'cancellation'
-- (restock já aplicado), o trigger não aplica de novo — evita
-- devolução duplicada caso o status seja re-gravado como 'cancelled'
-- mais de uma vez.
-- ============================================================

CREATE OR REPLACE FUNCTION public.restock_cancelled_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  mv RECORD;
BEGIN
  -- Só interessa a transição PARA 'cancelled' vinda de outro status.
  IF NEW.status IS DISTINCT FROM 'cancelled' OR OLD.status IS NOT DISTINCT FROM 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Já devolvido antes (idempotência) — não duplica.
  IF EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE reference_id = NEW.id AND type = 'cancellation'
  ) THEN
    RETURN NEW;
  END IF;

  FOR mv IN
    SELECT product_id, notes, SUM(quantity) AS qty
    FROM public.stock_movements
    WHERE reference_id = NEW.id AND type = 'reservation'
    GROUP BY product_id, notes
  LOOP
    IF mv.notes LIKE 'arroz: integral%' THEN
      UPDATE public.products
      SET rice_stock_integral = COALESCE(rice_stock_integral, 0) + ABS(mv.qty)
      WHERE id = mv.product_id;
    ELSIF mv.notes LIKE 'arroz: branco%' THEN
      UPDATE public.products
      SET rice_stock_branco = COALESCE(rice_stock_branco, 0) + ABS(mv.qty)
      WHERE id = mv.product_id;
    ELSE
      UPDATE public.products
      SET stock_quantity = stock_quantity + ABS(mv.qty)
      WHERE id = mv.product_id;
    END IF;

    INSERT INTO public.stock_movements(product_id, type, quantity, reference_id, notes)
    VALUES (mv.product_id, 'cancellation', ABS(mv.qty), NEW.id, 'devolução automática — pedido cancelado');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restock_cancelled_order ON public.orders;
CREATE TRIGGER trg_restock_cancelled_order
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restock_cancelled_order();
