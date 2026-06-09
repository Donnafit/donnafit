-- Tabela de avisos da barra de anúncios
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  text        text        not null,
  is_active   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- Dados iniciais
insert into public.announcements (text, is_active, sort_order) values
  ('Marmitas saudáveis feitas com ingredientes frescos todos os dias', true, 1),
  ('Peça até as 18h e receba no dia seguinte',                         true, 2),
  ('Pague no PIX e ganhe 5% de desconto no pedido',                   true, 3),
  ('Opções low carb, veganas e sem glúten disponíveis',               true, 4),
  ('Alimentação equilibrada que cabe no seu dia a dia',               true, 5);

-- RLS
alter table public.announcements enable row level security;

-- Leitura pública (site)
create policy "announcements_public_read"
  on public.announcements for select
  using (is_active = true);

-- Escrita apenas para service_role (API routes do admin)
create policy "announcements_service_all"
  on public.announcements for all
  to service_role
  using (true)
  with check (true);
