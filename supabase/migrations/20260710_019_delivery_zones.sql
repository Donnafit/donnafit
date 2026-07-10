-- ============================================================
-- Donna FIT — Frete variável por bairro (Curitiba e região)
-- Migration: 20260710_019_delivery_zones.sql
--
-- Substitui a taxa de entrega fixa (R$15 hardcoded em CheckoutForm.tsx)
-- por uma tabela de bairros/cidades com taxa própria, usada tanto no
-- checkout (dropdown de bairro) quanto na validação server-side do preço
-- do frete em /api/orders (nunca confiar no valor que o cliente envia,
-- mesmo padrão já usado para preço/estoque de produto).
-- ============================================================

create table if not exists public.delivery_zones (
  name text primary key,
  fee numeric(10,2) not null,
  active boolean not null default true
);

alter table public.delivery_zones enable row level security;

-- Leitura pública: checkout roda para cliente convidado (sem login).
create policy "delivery_zones_public_read"
  on public.delivery_zones for select
  to anon, authenticated
  using (active);

create policy "delivery_zones_service_write"
  on public.delivery_zones for all
  to service_role
  using (true) with check (true);

insert into public.delivery_zones (name, fee) values
  ('Abranches', 5),
  ('Barreirinha', 5),
  ('Cachoeira', 10),
  ('Almirante Tamandaré', 10),
  ('Taboão', 10),
  ('Pilarzinho', 10),
  ('Santa Cândida', 10),
  ('Boa Vista', 10),
  ('Bacacheri', 10),
  ('Tingui', 10),
  ('Atuba', 13),
  ('Bairro Alto', 13),
  ('Tarumã', 13),
  ('Bom Retiro', 10),
  ('Ahú', 10),
  ('Cabral', 10),
  ('Centro Cívico', 10),
  ('Juvevê', 10),
  ('São Francisco', 10),
  ('Mercês', 10),
  ('Centro', 10),
  ('Alto da Glória', 10),
  ('Hugo Lange', 10),
  ('Jardim Social', 12),
  ('Alto da Rua XV', 12),
  ('Bigorrilho', 12),
  ('Batel', 12),
  ('Rebouças', 12),
  ('Cristo Rei', 12),
  ('Jardim Botânico', 12),
  ('Prado Velho', 12),
  ('Guabirotuba', 13),
  ('Jardim das Américas', 13),
  ('Capão da Imbuia', 14),
  ('Cajuru', 14),
  ('Uberaba', 14),
  ('Hauer', 14),
  ('Boqueirão', 18),
  ('Alto Boqueirão', 18),
  ('Xaxim', 16),
  ('Sítio Cercado', 16),
  ('Ganchinho', 20),
  ('Umbará', 20),
  ('Campo de Santana', 20),
  ('Tatuquara', 20),
  ('Cidade Industrial', 15),
  ('Pinheirinho', 16),
  ('Capão Raso', 15),
  ('Novo Mundo', 14),
  ('Lindóia', 13),
  ('Fanny', 15),
  ('Portão', 14),
  ('Fazendinha', 16),
  ('Santa Quitéria', 13),
  ('Guaíra', 13),
  ('Parolin', 13),
  ('Água Verde', 13),
  ('Vila Isabel', 13),
  ('Seminário', 13),
  ('Campo Comprido', 14),
  ('Campina do Siqueira', 12),
  ('Mossunguê', 13),
  ('Santo Inácio', 14),
  ('Orleans', 15),
  ('São Braz', 14),
  ('Cascatinha', 14),
  ('Santa Felicidade', 14),
  ('Butiatuvinha', 14),
  ('Lamenha Pequena', 15),
  ('São João', 14),
  ('Vista Alegre', 10),
  ('Atuba (Colombo)', 15),
  ('Colombo', 15),
  ('São José dos Pinhais', 20)
on conflict (name) do update set fee = excluded.fee;
