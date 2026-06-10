-- Safe re-apply: add delivery_address if not already present
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL;
