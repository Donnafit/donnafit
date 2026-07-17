-- ============================================================
-- Donna FIT — Pedidos de produção da cozinha
-- Migration: 20260717_029_production_requests.sql
--
-- Formaliza o fluxo da aba Cozinha em duas etapas: hoje "Registrar
-- produção" soma direto no estoque numa única ação. Passa a existir um
-- pedido de produção (meta) criado primeiro; a quantidade REAL só é
-- somada ao estoque quando a cozinha marca como concluído — podendo
-- divergir da meta, já que o rendimento real da produção varia.
-- ============================================================

CREATE TABLE public.production_requests (
  id                 UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id         UUID          NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  requested_quantity INT           NOT NULL CHECK (requested_quantity > 0),
  actual_quantity    INT           CHECK (actual_quantity IS NULL OR actual_quantity > 0),
  status             TEXT          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'completed')),
  created_at         TIMESTAMPTZ   DEFAULT now(),
  completed_at       TIMESTAMPTZ
);

CREATE INDEX production_requests_status_idx ON public.production_requests (status, created_at);

ALTER TABLE public.production_requests ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de stock_movements/products: só admin/kitchen (is_staff())
-- acessa, nenhum acesso público/cliente.
CREATE POLICY "production_requests_staff_all"
  ON public.production_requests FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
