-- ============================================================
-- Donna FIT — Horário de atendimento personalizado por dia da semana
-- Migration: 20260814_037_store_settings_weekly_hours.sql
--
-- store_settings só tinha um par único open_hour/close_hour pra
-- semana inteira. Não dava pra configurar, por exemplo, sábado com
-- horário reduzido (10h às 14h) ou domingo fechado. Adiciona
-- weekly_hours (jsonb) com override por dia — chaves "seg".."dom",
-- cada uma { mode: "default" | "custom" | "closed", openHour?, closeHour? }.
-- Dia ausente ou mode "default" cai no open_hour/close_hour padrão
-- (comportamento atual, sem quebra).
--
-- Também abre leitura anônima da tabela: o rodapé do cardápio e a
-- página pública /horarios passam a exibir os dados reais (telefone,
-- endereço, horário) em vez de texto fixo no componente. A tabela só
-- guarda informação pública (nome, whatsapp, endereço de retirada,
-- horários) — nada sensível.
-- ============================================================

alter table public.store_settings
  add column if not exists weekly_hours jsonb not null default '{}'::jsonb;

DROP POLICY IF EXISTS "store_settings_anon_read" ON public.store_settings;
CREATE POLICY "store_settings_anon_read"
  ON public.store_settings FOR SELECT TO anon
  USING (true);
