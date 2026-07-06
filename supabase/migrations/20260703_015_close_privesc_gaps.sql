-- ============================================================
-- Donna FIT — Close privilege-escalation gaps found in security audit
-- Apply AFTER 20260703_014_admin_rls_hardening.sql
--
-- 1. profiles_own_update allowed any authenticated user to set their
--    OWN role to 'admin'/'kitchen' via the anon-key client — this
--    fully defeats the is_admin()/is_staff() checks added in 002/014.
--    Fix: a trigger silently reverts role changes made by non-admins,
--    regardless of which policy or RPC path attempted the write.
--
-- 2. reserve_stock/deduct_stock/adjust_stock are SECURITY DEFINER with
--    no internal role check and no REVOKE — Supabase exposes every
--    public-schema function to PostgREST RPC by default, so anyone with
--    the (public) anon key could call them directly and rewrite any
--    product's stock with no login at all.
--    Fix: revoke EXECUTE from anon/authenticated on reserve_stock and
--    deduct_stock (both are only ever called from elevated contexts —
--    the service-role checkout route and the SECURITY DEFINER
--    production trigger — never directly by a browser session, so this
--    doesn't break either flow). adjust_stock IS called directly from
--    the admin Estoque panel via the browser's anon-key client, so it
--    gets an explicit is_staff() check instead of a blanket revoke.
--
-- 3. products_admin_write required is_admin() only, so a 'kitchen'-role
--    account (which passes is_staff() everywhere else) gets a silent
--    RLS failure restocking via /api/kitchen/produce. Widened to
--    is_staff() to match the rest of the operational tables.
-- ============================================================

-- 1. Prevent self role escalation --------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 2. Lock down stock RPC functions --------------------------------------
REVOKE EXECUTE ON FUNCTION public.reserve_stock(UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_stock(UUID, INT, UUID)  FROM PUBLIC, anon, authenticated;

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
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Acesso negado: apenas equipe pode ajustar estoque';
  END IF;

  SELECT stock_quantity INTO v_old FROM public.products WHERE id = p_product_id;
  v_delta := p_new_quantity - v_old;

  UPDATE public.products
  SET stock_quantity = p_new_quantity
  WHERE id = p_product_id;

  INSERT INTO public.stock_movements(product_id, type, quantity, notes, created_by)
  VALUES (p_product_id, 'adjustment', v_delta, p_notes, auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_stock(UUID, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, INT, TEXT) TO authenticated;

-- 3. Let kitchen-role staff restock products, not just admin ------------
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write"
  ON public.products FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4. Announcements: writes should go through the admin (service-role)
--    client per the original design comment; add an explicit staff
--    check as defense-in-depth in the API route itself (see
--    src/app/api/announcements/route.ts).
