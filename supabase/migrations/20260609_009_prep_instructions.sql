-- Adiciona coluna de instruções de preparo nos produtos
ALTER TABLE products ADD COLUMN IF NOT EXISTS prep_instructions text;
