-- ============================================================
-- Donna FIT — Configurações da loja (Configurações do painel)
-- Migration: 20260709_017_store_settings.sql
-- Aplicada manualmente pelo cliente via SQL Editor do Supabase em 2026-07-09.
-- Registrada aqui só pra manter o histórico de schema no repo.
-- ============================================================

create table if not exists public.store_settings (
  id text primary key default 'default',
  store_name text not null default 'Donna FIT',
  whatsapp text default '',
  open_hour int not null default 10,
  close_hour int not null default 22,
  order_sound boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

create policy "store_settings_staff_read"
  on public.store_settings for select
  to authenticated
  using (true);

create policy "store_settings_service_write"
  on public.store_settings for all
  to service_role
  using (true) with check (true);

insert into public.store_settings (id) values ('default')
  on conflict (id) do nothing;
