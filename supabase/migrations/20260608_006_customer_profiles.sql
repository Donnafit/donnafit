-- Tabela de perfis de clientes (criada automaticamente no checkout)
CREATE TABLE IF NOT EXISTS customer_profiles (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  preferred_delivery TEXT DEFAULT 'pickup' CHECK (preferred_delivery IN ('pickup', 'delivery')),
  preferred_payment TEXT DEFAULT 'pix' CHECK (preferred_payment IN ('pix', 'card')),
  preferred_categories JSONB DEFAULT '[]'::jsonb,  -- [{category_id, count}]
  preferred_products JSONB DEFAULT '[]'::jsonb,    -- [{product_id, product_name, count}]
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por email (quando cliente se cadastrar depois)
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email) WHERE email IS NOT NULL;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_customer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_customer_profiles_updated_at();

-- RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Service role pode tudo (API route usa service role)
CREATE POLICY "service_role_all" ON customer_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clientes autenticados podem ver o próprio perfil (futuro)
CREATE POLICY "owner_select" ON customer_profiles
  FOR SELECT TO authenticated
  USING (phone = (auth.jwt() ->> 'phone'));
