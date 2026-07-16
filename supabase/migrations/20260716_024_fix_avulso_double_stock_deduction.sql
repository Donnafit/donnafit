-- ============================================================
-- Donna FIT — Fix dupla baixa de estoque para itens avulso
-- Migration: 20260716_024_fix_avulso_double_stock_deduction.sql
-- Apply AFTER 20260602_004_production_trigger.sql
--
-- Problema: reserve_stock (chamado em POST /api/orders, todos os
-- stock_type) já baixa estoque de itens avulso no checkout — isso foi
-- adicionado depois do trigger abaixo existir, pra impedir overselling
-- de avulso (ver comentário em src/app/api/orders/route.ts: "antes só
-- combo era checado — avulso podia vender infinitamente além do
-- estoque real"). Só que o trigger on_order_status_production
-- (20260602_004) ainda baixa estoque de avulso DE NOVO quando o
-- pedido entra em "production" — dupla baixa real para todo pedido
-- avulso que é movido para produção pelo Kanban.
--
-- Fix: o trigger deixa de mexer em estoque (reserve_stock no checkout
-- já cobre avulso e combo). Mantido como função vazia (não removido)
-- caso uma automação futura de produção precise dele (ex: log de
-- tempo de preparo, notificação) — só a baixa de estoque é retirada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_order_production_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Baixa de estoque (combo E avulso) já acontece em reserve_stock,
  -- chamado no checkout para todos os stock_type — ver
  -- src/app/api/orders/route.ts. Não duplicar aqui.
  RETURN NEW;
END;
$$;
