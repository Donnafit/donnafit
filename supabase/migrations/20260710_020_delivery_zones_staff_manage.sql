-- ============================================================
-- Donna FIT — Equipe pode gerenciar taxas de bairro direto do painel
-- Migration: 20260710_020_delivery_zones_staff_manage.sql
--
-- A policy original (20260710_019) só liberava SELECT com active=true,
-- o que impediria a equipe de ver/reativar bairros desativados na tela de
-- gestão em Rota de Entrega. Troca por: qualquer um (convidado ou cliente
-- logado) só lê bairros ativos — necessário pro reconhecimento automático
-- no checkout funcionar tanto deslogado quanto logado — e staff
-- (is_staff()) lê e escreve tudo direto pelo client do navegador, mesmo
-- padrão já usado em products_admin_write. RLS é permissiva (OR entre
-- policies), então staff soma as duas: ativos via a 1ª, tudo via a 2ª.
-- ============================================================

drop policy if exists "delivery_zones_public_read" on public.delivery_zones;

create policy "delivery_zones_public_read"
  on public.delivery_zones for select
  to public
  using (active);

create policy "delivery_zones_staff_manage"
  on public.delivery_zones for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
