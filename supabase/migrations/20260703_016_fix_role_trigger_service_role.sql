-- ============================================================
-- Donna FIT — Fix prevent_self_role_escalation trigger
-- Apply AFTER 20260703_015_close_privesc_gaps.sql
--
-- The trigger added in 015 checks public.is_admin(), which relies on
-- auth.uid() — that's NULL for requests made with the service-role key
-- (no browser session), so the trigger was also reverting legitimate
-- backend/service-role role changes (e.g. promoting a user to admin
-- via a script), not just blocking customer self-escalation.
--
-- Fix: also allow the change when the request's JWT role claim is
-- 'service_role' (auth.role()), which only the trusted server-side
-- service key can present — anon/authenticated browser sessions can
-- never claim this role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin()
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;
