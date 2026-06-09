-- Add delivery_address column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL;

COMMENT ON COLUMN public.orders.delivery_address IS 'Endereço de entrega (preenchido apenas quando delivery_type = delivery)';
