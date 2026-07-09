-- ============================================================
-- Donna FIT — Permite cliente ler o PRÓPRIO histórico de pedidos
-- Apply AFTER 20260703_014_admin_rls_hardening.sql
--
-- Achado testando "Meus Pedidos" de ponta a ponta (E2E): a migration 014
-- corrigiu corretamente o buraco de segurança onde QUALQUER usuário
-- autenticado (inclusive um cliente comum) podia ler os pedidos de
-- TODO MUNDO (orders_auth_read exigia só "authenticated", sem checar
-- dono). A correção (is_staff()) fechou isso — mas fechou demais: como
-- pedidos não têm coluna user_id (só customer_phone em texto livre,
-- porque o checkout aceita convidado sem login), nenhum cliente logado
-- consegue mais ver nem os PRÓPRIOS pedidos. "Meus Pedidos" ficou
-- sempre vazio pra todo cliente real desde a migration 014.
--
-- Fix: adiciona política extra que libera SELECT quando customer_phone
-- do pedido bate com o telefone salvo no user_metadata da sessão logada
-- (mesmo dado que o app já usa no client pra montar a query). Equipe
-- (is_staff()) continua com acesso total; um cliente continua sem
-- conseguir ver pedido de OUTRO cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.own_phone()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT regexp_replace(
    coalesce(auth.jwt() -> 'user_metadata' ->> 'phone', ''),
    '\D', '', 'g'
  );
$$;

DROP POLICY IF EXISTS "orders_auth_read" ON public.orders;
CREATE POLICY "orders_auth_read"
  ON public.orders FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR (public.own_phone() <> '' AND customer_phone = public.own_phone())
  );

DROP POLICY IF EXISTS "order_items_auth_read" ON public.order_items;
CREATE POLICY "order_items_auth_read"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND public.own_phone() <> ''
        AND o.customer_phone = public.own_phone()
    )
  );
