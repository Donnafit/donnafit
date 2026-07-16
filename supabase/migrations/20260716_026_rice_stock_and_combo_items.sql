-- ============================================================
-- Donna FIT — Estoque por tipo de arroz + composição de combos
-- Migration: 20260716_026_rice_stock_and_combo_items.sql
-- Apply AFTER 20260710_023_pickup_address.sql
--
-- Parte 1 (arroz): produtos que oferecem "ambos" os tipos de arroz
-- precisam de estoque separado por tipo — hoje só existe
-- rice_integral_available (booleano que só controla se a pergunta
-- aparece no checkout), sem nenhum estoque específico por tipo.
-- rice_stock_mode é a nova fonte de verdade: 'none' | 'integral' |
-- 'branco' | 'both'. Só quando é 'both' que rice_stock_integral e
-- rice_stock_branco são usados — nos outros 3 casos o produto
-- continua usando o stock_quantity genérico de sempre. NÃO é um
-- sistema de variação genérico: são 2 colunas fixas, específicas
-- desse par de tipos de arroz.
--
-- Parte 2 (combos): combo_items grava a composição de um produto
-- "combo" (quais produtos "individual" fazem parte e em que
-- quantidade). Produtos combo deixam de ter stock_quantity própria —
-- a baixa de estoque de uma venda de combo passa a mirar cada
-- componente (ver reserve_stock, chamado por componente em
-- src/app/api/orders/route.ts).
-- ============================================================

-- ---- Parte 1: estoque por tipo de arroz --------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rice_stock_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (rice_stock_mode IN ('none', 'integral', 'branco', 'both')),
  ADD COLUMN IF NOT EXISTS rice_stock_integral INT,
  ADD COLUMN IF NOT EXISTS rice_stock_branco   INT;

-- reserve_rice_stock: mesma lógica atômica do reserve_stock, mas mirando
-- a coluna de arroz certa. Só 2 ramos fixos (integral/branco) — nunca
-- SQL dinâmico com nome de coluna variável, pra não abrir brecha de
-- injeção.
CREATE OR REPLACE FUNCTION public.reserve_rice_stock(
  p_product_id UUID,
  p_rice_type  TEXT,
  p_quantity   INT,
  p_order_id   UUID
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_rice_type = 'integral' THEN
    UPDATE public.products
    SET rice_stock_integral = rice_stock_integral - p_quantity
    WHERE id = p_product_id AND rice_stock_integral >= p_quantity;
  ELSIF p_rice_type = 'branco' THEN
    UPDATE public.products
    SET rice_stock_branco = rice_stock_branco - p_quantity
    WHERE id = p_product_id AND rice_stock_branco >= p_quantity;
  ELSE
    RAISE EXCEPTION 'Tipo de arroz inválido: %', p_rice_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente (arroz %) para o produto %', p_rice_type, p_product_id;
  END IF;

  INSERT INTO public.stock_movements(product_id, type, quantity, reference_id, notes)
  VALUES (p_product_id, 'reservation', -p_quantity, p_order_id, 'arroz: ' || p_rice_type);
END;
$$;

-- Mesmo padrão de segurança do reserve_stock/deduct_stock (migration
-- 015 — close_privesc_gaps): só o service role (rota /api/orders) chama
-- isso, nunca o browser com a chave anon.
REVOKE EXECUTE ON FUNCTION public.reserve_rice_stock(UUID, TEXT, INT, UUID) FROM PUBLIC, anon, authenticated;

-- ---- Parte 2: composição de combos --------------------------------------
CREATE TABLE IF NOT EXISTS public.combo_items (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_product_id      UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity              INT         NOT NULL CHECK (quantity > 0),
  created_at            TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT combo_items_no_self_reference CHECK (combo_product_id <> component_product_id),
  CONSTRAINT combo_items_unique_component UNIQUE (combo_product_id, component_product_id)
);

CREATE INDEX IF NOT EXISTS idx_combo_items_combo_product_id ON public.combo_items(combo_product_id);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer staff logado (precisa listar/copiar composições no
-- cadastro de produto — ver EstoqueClient.tsx). Escrita: só admin,
-- mesmo nível de "products_admin_write".
DROP POLICY IF EXISTS "combo_items_auth_read" ON public.combo_items;
CREATE POLICY "combo_items_auth_read"
  ON public.combo_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "combo_items_admin_write" ON public.combo_items;
CREATE POLICY "combo_items_admin_write"
  ON public.combo_items FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
