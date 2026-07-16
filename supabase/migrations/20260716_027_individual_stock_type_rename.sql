-- ============================================================
-- Donna FIT — stock_type deixa de ser timing, vira composição
-- Migration: 20260716_027_individual_stock_type_rename.sql
-- Apply AFTER 20260716_026_rice_stock_and_combo_items.sql
--
-- Antes: stock_type controlava QUANDO baixava estoque — "combo" no
-- checkout (reserve_stock), "avulso" só quando o pedido entrava em
-- produção (trigger on_order_status_production -> deduct_stock). Isso
-- já estava furado na prática: src/app/api/orders/route.ts hoje chama
-- reserve_stock pra TODOS os itens (ver comentário no código), então
-- "avulso" tomava baixa DUAS vezes — reserva no checkout + dedução na
-- produção. Bug real de estoque duplicado.
--
-- Depois: stock_type descreve COMPOSIÇÃO — "individual" (era "avulso")
-- é um produto com stock_quantity própria, baixada uma única vez, sem
-- distinção de timing; "combo" é um pacote de produtos "individual"
-- (ver combo_items, migration 026), sem stock_quantity própria.
--
-- Decisão de migração (ver justificativa completa no plano): UPDATE
-- dos dados existentes + troca do CHECK, em vez de manter "avulso" no
-- banco e só renomear o label na UI.
-- ============================================================

-- 1. Remove o gatilho de baixa-na-produção e a função que ele chamava —
--    "individual" não diferencia mais timing de baixa (cliente pediu
--    explicitamente "controle de estoque único e simples"). Sem isso,
--    o bug de dupla-baixa descrito acima continuaria existindo mesmo
--    depois do rename.
DROP TRIGGER IF EXISTS on_order_status_production ON public.orders;
DROP FUNCTION IF EXISTS public.handle_order_production_stock();
DROP FUNCTION IF EXISTS public.deduct_stock(UUID, INT, UUID);

-- 2. Solta a CHECK constraint antiga ANTES de migrar os dados — ela só
--    permite ('combo', 'avulso'), então o UPDATE abaixo (que grava
--    'individual') seria rejeitado por ELA MESMA se ainda estivesse
--    ativa. (Correção de um bug de ordem no plano original: a versão
--    anterior deste arquivo comentava "migra antes de trocar o CHECK,
--    senão a constraint nova rejeitaria as linhas antigas" — mas é o
--    contrário: é a constraint ANTIGA que rejeita os valores NOVOS
--    enquanto ainda está no lugar. Confirmado batendo a cabeça nisso
--    ao aplicar esta migration.)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_type_check;

-- 3. Migra os dados existentes agora que a constraint antiga não bloqueia mais.
UPDATE public.products SET stock_type = 'individual' WHERE stock_type = 'avulso';

-- 4. Combos hoje têm stock_quantity "solta" (do freezer, sem
--    composição associada) — zera pra deixar explícito que esse número
--    não significa mais nada até a composição ser cadastrada (ver
--    passo manual pós-deploy, Task 6 do plano). Intencional: o painel
--    de Estoque vai mostrar esses combos como pendentes até o dono do
--    negócio configurar combo_items — é o empurrão visual pra não
--    esquecer o passo manual.
UPDATE public.products SET stock_quantity = 0 WHERE stock_type = 'combo';

-- 5. Agora que os dados estão limpos, adiciona a CHECK constraint nova.
ALTER TABLE public.products
  ADD CONSTRAINT products_stock_type_check CHECK (stock_type IN ('combo', 'individual'));
ALTER TABLE public.products ALTER COLUMN stock_type SET DEFAULT 'individual';
