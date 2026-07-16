# Estoque por Tipo de Arroz + Sistema de Combos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Permitir estoque separado por tipo de arroz (integral/branco) em produtos que oferecem os dois, sem criar um sistema de variação genérico; e (2) transformar `stock_type` de um controle de **timing** de baixa de estoque (combo=checkout, avulso=produção) em um controle de **composição** (combo = pacote de produtos "individual"), com uma tabela `combo_items` que decrementa o estoque de cada componente na venda de um combo.

**Architecture:** Duas colunas simples novas em `products` (`rice_stock_integral`, `rice_stock_branco`) mais um enum `rice_stock_mode` decidem, no momento da reserva de estoque em `/api/orders`, se a baixa mira o `stock_quantity` genérico (caso de sempre) ou uma das duas colunas de arroz (só quando `rice_stock_mode = 'both'`), via uma nova RPC atômica `reserve_rice_stock` espelhando o `reserve_stock` existente. Combos passam a ser só um produto normal (aparece no cardápio, tem preço) associado a uma nova tabela `combo_items` (composição); a venda de um combo nunca decrementa estoque próprio — em vez disso, o servidor expande cada item de combo do pedido nos seus componentes e chama o `reserve_stock` de cada um, multiplicando a quantidade do componente pela quantidade do combo pedida. O gatilho antigo de baixa-na-produção (`on_order_status_production`) é removido: hoje ele já causa dupla-baixa para itens "avulso" (a rota de pedidos já reserva TODOS os itens no checkout — ver comentário existente em `src/app/api/orders/route.ts`), e o cliente confirmou que não quer mais distinção de timing.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres), Playwright (e2e)

## Global Constraints

- **Não criar sistema de variação genérico.** `rice_stock_integral`/`rice_stock_branco` são 2 colunas fixas e específicas do par de tipos de arroz — não uma tabela `product_variants` genérica. Isso é deliberado (YAGNI): não existe hoje, e não foi pedido, nenhum outro eixo de variação.
- **Migração dos combos existentes é 100% manual, documentada, pós-deploy.** Nenhuma task deste plano tenta adivinhar automaticamente a composição de um combo já cadastrado — isso é conhecimento de negócio que não está no schema atual. A Task 6 apenas lista os combos pendentes; quem preenche a composição de cada um é o dono do negócio, pelo próprio formulário de edição (Task 5).
- **Toda mudança de baixa de estoque precisa de teste e2e de integridade estoque↔pedido** cobrindo o novo modelo (rice split e combo→componentes), seguindo o padrão de `e2e/api-orders-integrity.spec.ts` (chamar `/api/orders` de verdade, sem mockar, e verificar o banco depois).
- **Rename `"avulso"` → `"individual"`: escolhida migração de dados (`UPDATE ... SET stock_type='individual' WHERE stock_type='avulso'`) + troca do `CHECK` constraint, em vez de manter `"avulso"` no banco e só trocar o label na UI.** Justificativa:
  1. O mapeamento é 1:1 e sem ambiguidade — todo produto `"avulso"` de hoje É, por definição, um produto com stock próprio e simples, exatamente o que `"individual"` passa a significar. Não existe caso intermediário que a migração deixaria mal-classificado.
  2. Manter `"avulso"` como valor de banco enquanto todo o resto (RPCs, comentários, UI, este plano) passa a falar em `"individual"` cria uma dívida técnica permanente — dois nomes pra mesma coisa é o tipo de inconsistência mais caro de debugar depois (alguém lê `stock_type = 'avulso'` num query ad-hoc daqui a 6 meses e não sabe se isso é o `"individual"` novo ou um resquício).
  3. Os pontos que comparam a string `'avulso'` no código são poucos e já mapeados por grep (só `EstoqueClient.tsx` e a trigger antiga que este plano já remove), então o custo/risco da migração de dados é baixo — não é uma string espalhada por dezenas de arquivos.
  4. Efeito colateral que essa escolha **resolve de graça**: a trigger `on_order_status_production` hoje causa dupla-baixa de estoque pra itens `avulso` (reserva no checkout via `reserve_stock` + dedução na produção via `deduct_stock` — bug real, confirmado lendo `src/app/api/orders/route.ts` e `supabase/migrations/20260602_004_production_trigger.sql`). Como a nova semântica não diferencia mais timing, a trigger é removida junto com o rename, eliminando o bug.
---

## Task 1 — Migration SQL: `rice_stock_integral`/`rice_stock_branco`, `combo_items`, rename `stock_type`

**Files:**
- `supabase/migrations/20260716_024_rice_stock_and_combo_items.sql` (novo)
- `supabase/migrations/20260716_025_individual_stock_type_rename.sql` (novo)
- `supabase/seed.sql` (editar — script de seed mutável, não uma migration histórica; só troca o literal `'avulso'` por `'individual'`)
- `src/lib/supabase/database.types.ts` (editar)

**Interfaces:**
- Produces: coluna `products.rice_stock_mode` (`'none' | 'integral' | 'branco' | 'both'`, default `'none'`), `products.rice_stock_integral` (`INT`, nullable), `products.rice_stock_branco` (`INT`, nullable).
- Produces: tabela `public.combo_items(id, combo_product_id, component_product_id, quantity, created_at)`.
- Produces: RPC `public.reserve_rice_stock(p_product_id UUID, p_rice_type TEXT, p_quantity INT, p_order_id UUID)`.
- Produces: `products.stock_type` agora `CHECK (stock_type IN ('combo', 'individual'))`, default `'individual'`.
- Removes: trigger `on_order_status_production`, função `handle_order_production_stock()`, função `deduct_stock(UUID, INT, UUID)`.
- Consumes: `public.is_admin()` (RLS helper existente, migration `20260602_002`), tabela `stock_movements` existente (para os `INSERT` de auditoria do `reserve_rice_stock`, mesmo padrão do `reserve_stock`).

**Steps:**

- [ ] Criar `supabase/migrations/20260716_024_rice_stock_and_combo_items.sql`:

```sql
-- ============================================================
-- Donna FIT — Estoque por tipo de arroz + composição de combos
-- Migration: 20260716_024_rice_stock_and_combo_items.sql
-- Apply AFTER 20260710_023_pickup_address.sql
--
-- Parte 1 (arroz): produtos que oferecem "ambos" os tipos de arroz
-- precisam de estoque separado por tipo — hoje só existe
-- rice_integral_available (booleano que só controla se a pergunta
-- aparece no checkout), sem nenhum estoque específico por tipo.
-- rice_stock_mode é a nova fonte de verdade: 'none' | 'integral' |
-- 'branco' | 'both'. Só quando é 'both' que rice_stock_integral e
-- rice_stock_branco são usados — nos outros 3 casos o produto
-- continua usando o stock_quantity genérico de sempre. NÃO é um
-- sistema de variação genérico: são 2 colunas fixas, específicas
-- desse par de tipos de arroz.
--
-- Parte 2 (combos): combo_items grava a composição de um produto
-- "combo" (quais produtos "individual" fazem parte e em que
-- quantidade). Produtos combo deixam de ter stock_quantity própria —
-- a baixa de estoque de uma venda de combo passa a mirar cada
-- componente (ver reserve_stock, chamado por componente em
-- src/app/api/orders/route.ts).
-- ============================================================

-- ---- Parte 1: estoque por tipo de arroz --------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rice_stock_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (rice_stock_mode IN ('none', 'integral', 'branco', 'both')),
  ADD COLUMN IF NOT EXISTS rice_stock_integral INT,
  ADD COLUMN IF NOT EXISTS rice_stock_branco   INT;

-- reserve_rice_stock: mesma lógica atômica do reserve_stock, mas mirando
-- a coluna de arroz certa. Só 2 ramos fixos (integral/branco) — nunca
-- SQL dinâmico com nome de coluna variável, pra não abrir brecha de
-- injeção.
CREATE OR REPLACE FUNCTION public.reserve_rice_stock(
  p_product_id UUID,
  p_rice_type  TEXT,
  p_quantity   INT,
  p_order_id   UUID
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_rice_type = 'integral' THEN
    UPDATE public.products
    SET rice_stock_integral = rice_stock_integral - p_quantity
    WHERE id = p_product_id AND rice_stock_integral >= p_quantity;
  ELSIF p_rice_type = 'branco' THEN
    UPDATE public.products
    SET rice_stock_branco = rice_stock_branco - p_quantity
    WHERE id = p_product_id AND rice_stock_branco >= p_quantity;
  ELSE
    RAISE EXCEPTION 'Tipo de arroz inválido: %', p_rice_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente (arroz %) para o produto %', p_rice_type, p_product_id;
  END IF;

  INSERT INTO public.stock_movements(product_id, type, quantity, reference_id, notes)
  VALUES (p_product_id, 'reservation', -p_quantity, p_order_id, 'arroz: ' || p_rice_type);
END;
$$;

-- Mesmo padrão de segurança do reserve_stock/deduct_stock (migration
-- 015 — close_privesc_gaps): só o service role (rota /api/orders) chama
-- isso, nunca o browser com a chave anon.
REVOKE EXECUTE ON FUNCTION public.reserve_rice_stock(UUID, TEXT, INT, UUID) FROM PUBLIC, anon, authenticated;

-- ---- Parte 2: composição de combos --------------------------------------
CREATE TABLE IF NOT EXISTS public.combo_items (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_product_id      UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity              INT         NOT NULL CHECK (quantity > 0),
  created_at            TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT combo_items_no_self_reference CHECK (combo_product_id <> component_product_id),
  CONSTRAINT combo_items_unique_component UNIQUE (combo_product_id, component_product_id)
);

CREATE INDEX IF NOT EXISTS idx_combo_items_combo_product_id ON public.combo_items(combo_product_id);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer staff logado (precisa listar/copiar composições no
-- cadastro de produto — ver EstoqueClient.tsx). Escrita: só admin,
-- mesmo nível de "products_admin_write".
DROP POLICY IF EXISTS "combo_items_auth_read" ON public.combo_items;
CREATE POLICY "combo_items_auth_read"
  ON public.combo_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "combo_items_admin_write" ON public.combo_items;
CREATE POLICY "combo_items_admin_write"
  ON public.combo_items FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

- [ ] Criar `supabase/migrations/20260716_025_individual_stock_type_rename.sql`:

```sql
-- ============================================================
-- Donna FIT — stock_type deixa de ser timing, vira composição
-- Migration: 20260716_025_individual_stock_type_rename.sql
-- Apply AFTER 20260716_024_rice_stock_and_combo_items.sql
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
-- (ver combo_items, migration 024), sem stock_quantity própria.
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

-- 2. Migra os dados existentes antes de trocar o CHECK (senão a
--    constraint nova rejeitaria as linhas antigas).
UPDATE public.products SET stock_type = 'individual' WHERE stock_type = 'avulso';

-- 3. Combos hoje têm stock_quantity "solta" (do freezer, sem
--    composição associada) — zera pra deixar explícito que esse número
--    não significa mais nada até a composição ser cadastrada (ver
--    passo manual pós-deploy, Task 6 do plano). Intencional: o painel
--    de Estoque vai mostrar esses combos como pendentes até o dono do
--    negócio configurar combo_items — é o empurrão visual pra não
--    esquecer o passo manual.
UPDATE public.products SET stock_quantity = 0 WHERE stock_type = 'combo';

-- 4. Troca a CHECK constraint e o default da coluna.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_type_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_stock_type_check CHECK (stock_type IN ('combo', 'individual'));
ALTER TABLE public.products ALTER COLUMN stock_type SET DEFAULT 'individual';
```

- [ ] Em `supabase/seed.sql`, trocar os literais `'avulso'` (linhas dos blocos "Pratos Principais", "Massas", "Sopas e Caldos", "Low Carb"/"Vegetariano", "Adicionais" — cada bloco tem um `SELECT cat.id, ..., 'avulso', 50, ...`) por `'individual'`. **Não editar** `supabase/migrations/20260609_008_seed_products.sql` nem qualquer outro arquivo em `supabase/migrations/` além dos dois novos criados acima — são migrations já aplicadas, editar histórico é anti-padrão. `seed.sql` é o único artefato de seed mutável (usado pra popular ambientes novos/dev), por isso pode ser ajustado.

- [ ] Atualizar `src/lib/supabase/database.types.ts`:
  - No bloco `products` (`Row`, `Insert`, `Update`), trocar `stock_type: "combo" | "avulso"` → `stock_type: "combo" | "individual"` (e o equivalente `?:` em `Insert`/`Update`), e adicionar em cada um: `rice_stock_mode: "none" | "integral" | "branco" | "both"` (`?:` nos dois últimos), `rice_stock_integral: number | null`, `rice_stock_branco: number | null`.
  - Adicionar um novo bloco de tabela, logo após `products` e antes de `orders`:
    ```ts
    combo_items: {
      Row: {
        id: string
        combo_product_id: string
        component_product_id: string
        quantity: number
        created_at: string
      }
      Insert: {
        id?: string
        combo_product_id: string
        component_product_id: string
        quantity: number
        created_at?: string
      }
      Update: {
        id?: string
        combo_product_id?: string
        component_product_id?: string
        quantity?: number
        created_at?: string
      }
    }
    ```
  - No bloco `Functions`, remover a entrada `deduct_stock` (função dropada) e adicionar:
    ```ts
    reserve_rice_stock: {
      Args: { p_product_id: string; p_rice_type: string; p_quantity: number; p_order_id: string }
      Returns: void
    }
    ```

- [ ] Aplicar as duas migrations novas via Supabase Dashboard → SQL Editor (mesma convenção usada em todas as migrations anteriores — não há CLI/`config.toml` neste projeto), na ordem 024 depois 025. Confirmar rodando:
  ```sql
  select column_name from information_schema.columns where table_name = 'products' and column_name like 'rice_stock%';
  select constraint_name, check_clause from information_schema.check_constraints where constraint_name = 'products_stock_type_check';
  select * from public.combo_items limit 1;
  select stock_type, count(*) from public.products group by stock_type;
  ```
  Confirmar que não existe mais nenhuma linha com `stock_type = 'avulso'` e que a trigger `on_order_status_production` não existe mais (`select tgname from pg_trigger where tgname = 'on_order_status_production';` deve vir vazio).
- [ ] Rodar `npx tsc --noEmit` pra confirmar que `database.types.ts` compila sem erro (nenhum outro arquivo ainda usa os tipos novos, então não deve haver erro de uso — só de sintaxe do arquivo em si).
- [ ] Commit: `git add supabase/migrations/20260716_024_rice_stock_and_combo_items.sql supabase/migrations/20260716_025_individual_stock_type_rename.sql supabase/seed.sql src/lib/supabase/database.types.ts && git commit -m "feat(db): add rice stock split, combo_items table, rename stock_type avulso->individual"`

---

## Task 2 — Baixa de estoque por tipo de arroz em `api/orders/route.ts`

**Files:**
- `src/app/api/orders/route.ts` (editar)

**Interfaces:**
- Consumes: `products.rice_stock_mode`, `products.rice_stock_integral`, `products.rice_stock_branco` (Task 1), RPC `reserve_rice_stock` (Task 1), RPC `reserve_stock` (já existente).
- Produces: tipo `StockOp` e funções `buildRiceOp`/`reserveOp` dentro da rota (usados e estendidos pela Task 3), variável `stockOps: StockOp[]` substituindo o antigo loop direto sobre `body.items`.

**Steps:**

- [ ] Em `src/app/api/orders/route.ts`, ampliar o `select` da query de produtos (linha ~62):
  - De:
    ```ts
    .select("id, name, sku, price, stock_type, is_active, rice_integral_available")
    ```
  - Para:
    ```ts
    .select("id, name, sku, price, stock_type, is_active, rice_integral_available, rice_stock_mode, rice_stock_integral, rice_stock_branco")
    ```

- [ ] Substituir todo o bloco de reserva de estoque (o trecho que começa em `// Reserva o estoque de TODOS os itens...` e termina no `return NextResponse.json({ error: ... insuficiente ... })`) por:

```ts
  // Cada item do pedido vira uma ou mais "operações de estoque". Um item
  // comum vira 1 operação simples (mira stock_quantity); um item com
  // estoque dividido por tipo de arroz (rice_stock_mode === "both") vira
  // 1 operação "rice" (mira rice_stock_integral ou rice_stock_branco,
  // conforme a escolha do cliente). Itens "combo" ganham uma expansão
  // própria em componentes — ver Task 3.
  interface StockOp {
    kind: "simple" | "rice"
    productId: string
    quantity: number
    riceType?: "integral" | "branco"
    label: string
  }

  function buildRiceOp(item: (typeof body.items)[number]): StockOp {
    const requested = body.riceChoices?.[item.product.id]
    // Mesmo princípio de nunca confiar em escolha que devia ser travada
    // no servidor — já usado acima pras notas do pedido (riceNotes).
    const riceType: "integral" | "branco" = requested === "integral" ? "integral" : "branco"
    return { kind: "rice", productId: item.product.id, quantity: item.quantity, riceType, label: item.product.name }
  }

  const stockOps: StockOp[] = body.items.map((item) => {
    const fresh = freshById.get(item.product.id)
    if (fresh.rice_stock_mode === "both") return buildRiceOp(item)
    return { kind: "simple", productId: item.product.id, quantity: item.quantity, label: item.product.name }
  })

  // Reserva o estoque de TODAS as operações (antes só "combo" era checado
  // — "avulso" podia vender infinitamente além do estoque real). Atômico
  // no banco: se duas requisições concorrentes disputam a última
  // unidade, só uma consegue.
  function reserveOp(op: StockOp, quantity: number) {
    return op.kind === "rice"
      ? supabase.rpc("reserve_rice_stock", { p_product_id: op.productId, p_rice_type: op.riceType, p_quantity: quantity, p_order_id: order.id })
      : supabase.rpc("reserve_stock", { p_product_id: op.productId, p_quantity: quantity, p_order_id: order.id })
  }

  const reserveResults = await Promise.allSettled(stockOps.map((op) => reserveOp(op, op.quantity)))
  const failedOps = reserveResults
    .map((r, i) => ({ r, op: stockOps[i] }))
    .filter(({ r }) => r.status === "rejected" || (r as PromiseFulfilledResult<any>).value?.error)

  if (failedOps.length > 0) {
    // Desfaz as reservas que deram certo, pra não vazar estoque, e cancela o pedido.
    const succeededOps = stockOps.filter((_, i) => {
      const r = reserveResults[i]
      return r.status === "fulfilled" && !(r as PromiseFulfilledResult<any>).value?.error
    })
    await Promise.allSettled(succeededOps.map((op) => reserveOp(op, -op.quantity)))
    await supabase.from("orders").delete().eq("id", order.id)

    return NextResponse.json(
      { error: `Estoque insuficiente para: ${[...new Set(failedOps.map(({ op }) => op.label))].join(", ")}` },
      { status: 409 }
    )
  }
```

- [ ] Verificação manual: com o dev server rodando (`npm run dev`), criar (via SQL editor ou pelo painel após Task 4) um produto `individual` com `rice_stock_mode = 'both'`, `rice_stock_integral = 3`, `rice_stock_branco = 3`, e fazer um `POST /api/orders` (`curl` ou o próprio checkout) escolhendo integral com quantidade 2 — confirmar que só `rice_stock_integral` cai pra 1 e `rice_stock_branco` continua 3.
- [ ] Commit: `git add src/app/api/orders/route.ts && git commit -m "feat(orders): decrement rice-specific stock column when product has split rice stock"`

---

## Task 3 — Baixa de estoque de combo (decrementar componentes) em `api/orders/route.ts`

**Files:**
- `src/app/api/orders/route.ts` (editar)

**Interfaces:**
- Consumes: tabela `combo_items` (Task 1), `StockOp`/`reserveOp`/`buildRiceOp` (Task 2).
- Produces: `comboProductIds`, `comboItemsByComboId`, e a nova construção de `stockOps` com expansão de combo em componentes.

**Steps:**

- [ ] Substituir o bloco `const stockOps: StockOp[] = body.items.map(...)` (criado na Task 2) por:

```ts
  // Itens "combo" não têm stock_quantity própria — a baixa mira cada
  // componente individual (combo_items), multiplicando a quantidade do
  // componente pela quantidade do combo no pedido.
  const comboProductIds = body.items
    .map((item) => item.product.id)
    .filter((id) => freshById.get(id)?.stock_type === "combo")

  const comboItemsByComboId = new Map<string, { component_product_id: string; quantity: number }[]>()
  if (comboProductIds.length > 0) {
    const { data: comboItemsData, error: comboItemsErr } = await supabase
      .from("combo_items")
      .select("combo_product_id, component_product_id, quantity")
      .in("combo_product_id", comboProductIds)

    if (comboItemsErr) {
      return NextResponse.json({ error: "Erro ao validar composição do combo", detail: comboItemsErr.message }, { status: 500 })
    }
    for (const ci of comboItemsData ?? []) {
      const list = comboItemsByComboId.get(ci.combo_product_id) ?? []
      list.push({ component_product_id: ci.component_product_id, quantity: ci.quantity })
      comboItemsByComboId.set(ci.combo_product_id, list)
    }
  }

  const stockOps: StockOp[] = body.items.flatMap((item) => {
    const fresh = freshById.get(item.product.id)
    if (fresh.stock_type === "combo") {
      const components = comboItemsByComboId.get(item.product.id) ?? []
      if (components.length === 0) {
        // Combo sem composição cadastrada ainda (migração manual — ver
        // Task 6 do plano): nenhuma operação de estoque é gerada pra
        // ele, ou seja, essa venda NÃO baixa estoque de ninguém. É
        // esperado até a composição ser configurada, mas fica logado
        // pra ficar visível em produção.
        console.warn(`Combo ${item.product.id} (${item.product.name}) sem combo_items configurados — venda não baixou estoque de nenhum componente.`)
      }
      return components.map((comp) => ({
        kind: "simple" as const,
        productId: comp.component_product_id,
        quantity: comp.quantity * item.quantity,
        label: item.product.name,
      }))
    }
    if (fresh.rice_stock_mode === "both") return [buildRiceOp(item)]
    return [{ kind: "simple" as const, productId: item.product.id, quantity: item.quantity, label: item.product.name }]
  })
```

- [ ] Verificação manual: criar (via SQL editor) um combo com 2 componentes (`combo_items`: componente A quantidade 2, componente B quantidade 1), fazer um pedido do combo com quantidade 3, e confirmar que o componente A caiu 6 unidades e o componente B caiu 3 unidades — nenhuma baixa em `stock_quantity` do próprio combo.
- [ ] Commit: `git add src/app/api/orders/route.ts && git commit -m "feat(orders): decrement each combo component's stock instead of the combo's own stock"`

---

## Task 4 — UI de cadastro: estoque por tipo de arroz em `EstoqueClient.tsx`

**Files:**
- `src/components/admin/EstoqueClient.tsx` (editar)

**Interfaces:**
- Consumes: `products.rice_stock_mode`, `rice_stock_integral`, `rice_stock_branco` (Task 1).
- Produces: campos `rice_stock_mode`/`rice_stock_integral`/`rice_stock_branco` em `ProductWithCat` e no `form` do `ProductModal`; constante `riceStockModeOptions`; payload de salvar incluindo esses 3 campos + `rice_integral_available` derivado.

**Steps:**

- [ ] Atualizar a interface `ProductWithCat` (topo do arquivo), adicionando os 3 campos novos (mantendo `stock_type: "combo" | "avulso"` como está — o rename para `"individual"` é feito na Task 5):
  - De:
    ```ts
    interface ProductWithCat {
      id: string
      name: string
      sku: string | null
      description: string | null
      price: number
      category_id: string | null
      is_active: boolean
      stock_quantity: number
      min_stock_alert: number
      stock_type: "combo" | "avulso"
      image_url: string | null
      categories: { name: string; slug: string } | null
    }
    ```
  - Para:
    ```ts
    interface ProductWithCat {
      id: string
      name: string
      sku: string | null
      description: string | null
      price: number
      category_id: string | null
      is_active: boolean
      stock_quantity: number
      min_stock_alert: number
      stock_type: "combo" | "avulso"
      rice_stock_mode: "none" | "integral" | "branco" | "both"
      rice_stock_integral: number | null
      rice_stock_branco: number | null
      image_url: string | null
      categories: { name: string; slug: string } | null
    }
    ```

- [ ] No `ProductModal`, ampliar o estado inicial do `form`:
  - De:
    ```ts
    const [form, setForm] = useState({
      name: productToEdit?.name ?? "",
      description: productToEdit?.description ?? "",
      sku: productToEdit?.sku ?? "",
      price: productToEdit?.price?.toString() ?? "",
      image_url: productToEdit?.image_url ?? "",
      category_id: productToEdit?.category_id ?? "",
      stock_type: productToEdit?.stock_type ?? "combo",
      stock_quantity: productToEdit?.stock_quantity?.toString() ?? "0",
      min_stock_alert: productToEdit?.min_stock_alert?.toString() ?? "10",
      is_active: productToEdit?.is_active ?? true,
    })
    ```
  - Para:
    ```ts
    const [form, setForm] = useState({
      name: productToEdit?.name ?? "",
      description: productToEdit?.description ?? "",
      sku: productToEdit?.sku ?? "",
      price: productToEdit?.price?.toString() ?? "",
      image_url: productToEdit?.image_url ?? "",
      category_id: productToEdit?.category_id ?? "",
      stock_type: productToEdit?.stock_type ?? "combo",
      stock_quantity: productToEdit?.stock_quantity?.toString() ?? "0",
      min_stock_alert: productToEdit?.min_stock_alert?.toString() ?? "10",
      is_active: productToEdit?.is_active ?? true,
      rice_stock_mode: productToEdit?.rice_stock_mode ?? "none",
      rice_stock_integral: productToEdit?.rice_stock_integral?.toString() ?? "0",
      rice_stock_branco: productToEdit?.rice_stock_branco?.toString() ?? "0",
    })
    ```

- [ ] Logo abaixo da declaração de `typeOptions`, adicionar:
  ```ts
  const riceStockModeOptions: DropdownOption[] = [
    { value: "none",     label: "Sem arroz" },
    { value: "integral", label: "Só arroz integral" },
    { value: "branco",   label: "Só arroz branco" },
    { value: "both",     label: "Ambos — estoque separado" },
  ]
  ```

- [ ] Em `handleSubmit`, trocar o `payload`:
  - De:
    ```ts
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sku: form.sku.trim().toUpperCase() || null,
      price: Number(Number(form.price).toFixed(2)),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id || null,
      stock_type: form.stock_type,
      stock_quantity: Math.max(0, parseInt(form.stock_quantity) || 0),
      min_stock_alert: Math.max(1, parseInt(form.min_stock_alert) || 10),
      is_active: form.is_active,
    }
    ```
  - Para:
    ```ts
    const isRiceSplit = form.rice_stock_mode === "both"
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sku: form.sku.trim().toUpperCase() || null,
      price: Number(Number(form.price).toFixed(2)),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id || null,
      stock_type: form.stock_type,
      stock_quantity: isRiceSplit ? 0 : Math.max(0, parseInt(form.stock_quantity) || 0),
      min_stock_alert: Math.max(1, parseInt(form.min_stock_alert) || 10),
      is_active: form.is_active,
      rice_stock_mode: form.rice_stock_mode,
      rice_stock_integral: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_integral) || 0) : null,
      rice_stock_branco: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_branco) || 0) : null,
      // false só quando "branco" (força Branco no checkout, igual já
      // funciona hoje); nos outros 3 modos o checkout continua livre
      // pra oferecer as duas opções — "só integral" não tem como travar
      // a escolha do lado do cliente hoje (não existe esse conceito na
      // modal de arroz), então é uma responsabilidade do cadastro, não
      // do código: ver nota abaixo.
      rice_integral_available: form.rice_stock_mode !== "branco",
    }
    ```
  > **Nota (limitação conhecida, aceita por escopo):** o modal de arroz do checkout (`CheckoutForm.tsx`) só sabe "oferecer os dois tipos" ou "forçar Branco" — não existe hoje um "forçar Integral". Um produto cadastrado como "Só arroz integral" ainda mostra o botão Branco na modal, mas como nesse modo (assim como "Só branco" e "Sem arroz") a baixa mira o `stock_quantity` genérico (não uma coluna específica de arroz), isso não corrompe a integridade do estoque — é só um descompasso cosmético que a instrução deste plano ("fluxo do cliente idêntico") explicitamente proíbe resolver mexendo no checkout.

- [ ] Inserir o dropdown "Estoque de Arroz" logo após o grid "Categoria + Tipo", e tornar o bloco "Estoque Inicial + Alerta" condicional:
  - De:
    ```tsx
          {/* Estoque Inicial + Alerta */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            <div>
              <label style={labelStyle}>Estoque Inicial</label>
              <input type="number" min="0" className="modal-input" style={inputStyle}
                value={form.stock_quantity}
                onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Alerta de Baixo Estoque</label>
              <input type="number" min="1" className="modal-input" style={inputStyle}
                value={form.min_stock_alert}
                onChange={(e) => setForm((f) => ({ ...f, min_stock_alert: e.target.value }))} />
            </div>
          </div>
    ```
  - Para:
    ```tsx
          {/* Estoque de Arroz — específico pra esse par de tipos, não é
              um sistema de variação genérico */}
          <div>
            <label style={labelStyle}>Estoque de Arroz</label>
            <CustomDropdown
              value={form.rice_stock_mode}
              onChange={(v) => setForm((f) => ({ ...f, rice_stock_mode: v as typeof f.rice_stock_mode }))}
              options={riceStockModeOptions}
            />
          </div>

          {/* Estoque Inicial + Alerta — os 2 campos de arroz substituem
              o Estoque Inicial quando rice_stock_mode === "both" */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            {form.rice_stock_mode === "both" ? (
              <>
                <div>
                  <label style={labelStyle}>Estoque — Arroz Integral</label>
                  <input type="number" min="0" className="modal-input" style={inputStyle}
                    value={form.rice_stock_integral}
                    onChange={(e) => setForm((f) => ({ ...f, rice_stock_integral: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Estoque — Arroz Branco</label>
                  <input type="number" min="0" className="modal-input" style={inputStyle}
                    value={form.rice_stock_branco}
                    onChange={(e) => setForm((f) => ({ ...f, rice_stock_branco: e.target.value }))} />
                </div>
              </>
            ) : (
              <div>
                <label style={labelStyle}>Estoque Inicial</label>
                <input type="number" min="0" className="modal-input" style={inputStyle}
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Alerta de Baixo Estoque</label>
              <input type="number" min="1" className="modal-input" style={inputStyle}
                value={form.min_stock_alert}
                onChange={(e) => setForm((f) => ({ ...f, min_stock_alert: e.target.value }))} />
            </div>
          </div>
    ```

- [ ] Rodar `npx tsc --noEmit` — deve compilar limpo.
- [ ] Verificação manual: abrir `/admin/estoque`, criar um produto com "Ambos" em Estoque de Arroz, confirmar que os 2 campos de arroz aparecem no lugar de "Estoque Inicial", salvar, e confirmar no banco que `rice_stock_integral`/`rice_stock_branco` foram gravados e `stock_quantity` ficou 0.
- [ ] Commit: `git add src/components/admin/EstoqueClient.tsx && git commit -m "feat(admin): add rice stock mode selector and split quantity fields to product form"`

---

## Task 5 — UI de cadastro: composição de combo (com "copiar de combo existente") em `EstoqueClient.tsx`

**Files:**
- `src/components/admin/EstoqueClient.tsx` (editar)

**Interfaces:**
- Consumes: tabela `combo_items` + RLS (Task 1), `stock_type` renomeado pra `"individual"` (migration da Task 1), estado/payload do `ProductModal` produzido pela Task 4.
- Produces: componente `ComboComposer`; estado `comboComponents`/`individualProducts`/`comboOptions` no `ProductModal`; sincronização de `combo_items` ao salvar; tratamento visual de linhas "combo" na listagem principal.

**Steps:**

- [ ] Atualizar a interface `ProductWithCat`, trocando a linha `stock_type: "combo" | "avulso"` por `stock_type: "combo" | "individual"`.

- [ ] Logo após o componente `ImageUploader` (antes do comentário `// ─── Modal de Produto`), adicionar os tipos e o componente `ComboComposer`:

```tsx
// ─── Composição de Combo ────────────────────────────────────────────────────
interface ComboComponentDraft {
  component_product_id: string
  quantity: string
}

interface SimpleProductOption {
  id: string
  name: string
}

interface ComboComposerProps {
  components: ComboComponentDraft[]
  onChange: (next: ComboComponentDraft[]) => void
  individualProducts: SimpleProductOption[]
  comboOptions: SimpleProductOption[]
  onCopyFrom: (comboId: string) => void
}

function ComboComposer({ components, onChange, individualProducts, comboOptions, onCopyFrom }: ComboComposerProps) {
  const productOptions: DropdownOption[] = individualProducts.map((p) => ({ value: p.id, label: p.name }))
  const copyOptions: DropdownOption[] = [
    { value: "", label: "Copiar composição de um combo existente…" },
    ...comboOptions.map((p) => ({ value: p.id, label: p.name })),
  ]

  function updateRow(index: number, patch: Partial<ComboComponentDraft>) {
    onChange(components.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  function removeRow(index: number) {
    onChange(components.filter((_, i) => i !== index))
  }
  function addRow() {
    onChange([...components, { component_product_id: "", quantity: "1" }])
  }

  return (
    <div>
      <label style={{
        fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
        color: "var(--text-300)", letterSpacing: "0.5px", textTransform: "uppercase",
        display: "block", marginBottom: 5,
      }}>
        Composição do Combo
      </label>

      <div style={{ marginBottom: 10 }}>
        <CustomDropdown value="" onChange={onCopyFrom} options={copyOptions} placeholder="Copiar composição de um combo existente…" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {components.map((row, index) => (
          <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 3 }}>
              <CustomDropdown
                value={row.component_product_id}
                onChange={(v) => updateRow(index, { component_product_id: v })}
                options={productOptions}
                placeholder="Produto…"
                compact
              />
            </div>
            <input
              type="number" min="1"
              value={row.quantity}
              onChange={(e) => updateRow(index, { quantity: e.target.value })}
              style={{
                width: 64, fontFamily: "var(--font-ui)", fontSize: 13,
                color: "var(--text-950)", background: "var(--surface-50)",
                border: "1px solid var(--surface-200)", borderRadius: 9,
                padding: "0 10px", height: 40, outline: "none", boxSizing: "border-box",
              }}
            />
            <button type="button" onClick={() => removeRow(index)} aria-label="Remover componente"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "var(--surface-200)", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <X size={13} strokeWidth={2.5} style={{ color: "var(--text-700)" }} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} style={{
        display: "flex", alignItems: "center", gap: 6, marginTop: 10,
        background: "none", border: "none", cursor: "pointer", padding: "4px 0",
        fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--gold-500)",
      }}>
        <PlusCircle size={14} strokeWidth={2.5} />
        Adicionar produto ao combo
      </button>

      {components.length === 0 && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 8 }}>
          Nenhum componente adicionado — o combo não terá baixa de estoque até que você adicione ao menos um produto.
        </p>
      )}
    </div>
  )
}
```

- [ ] No `ProductModal`, adicionar `const isCombo = form.stock_type === "combo"` logo após a declaração do `form`, e adicionar estado + efeitos:

```tsx
  const [comboComponents, setComboComponents]     = useState<ComboComponentDraft[]>([])
  const [individualProducts, setIndividualProducts] = useState<SimpleProductOption[]>([])
  const [comboOptions, setComboOptions]           = useState<SimpleProductOption[]>([])

  useEffect(() => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    sb.from("products").select("id, name").eq("stock_type", "individual").order("name")
      .then(({ data }: { data: SimpleProductOption[] | null }) =>
        setIndividualProducts((data ?? []).filter((p) => p.id !== productToEdit?.id)))
    sb.from("products").select("id, name").eq("stock_type", "combo").order("name")
      .then(({ data }: { data: SimpleProductOption[] | null }) =>
        setComboOptions((data ?? []).filter((p) => p.id !== productToEdit?.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!productToEdit || productToEdit.stock_type !== "combo") return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from("combo_items").select("component_product_id, quantity")
      .eq("combo_product_id", productToEdit.id)
      .then(({ data }: { data: { component_product_id: string; quantity: number }[] | null }) => {
        if (data) setComboComponents(data.map((d) => ({ component_product_id: d.component_product_id, quantity: String(d.quantity) })))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCopyFrom(comboId: string) {
    if (!comboId) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("combo_items")
      .select("component_product_id, quantity")
      .eq("combo_product_id", comboId)
    setComboComponents((data ?? []).map((d: { component_product_id: string; quantity: number }) => ({
      component_product_id: d.component_product_id,
      quantity: String(d.quantity),
    })))
  }
```

- [ ] Em `handleSubmit`, ajustar o `payload` da Task 4 pra considerar combo (combo nunca tem rice split nem stock próprio) e sincronizar `combo_items` depois de salvar o produto:
  - De (payload produzido na Task 4):
    ```ts
    const isRiceSplit = form.rice_stock_mode === "both"
    const payload = {
      ...
      stock_quantity: isRiceSplit ? 0 : Math.max(0, parseInt(form.stock_quantity) || 0),
      ...
      rice_stock_mode: form.rice_stock_mode,
      rice_stock_integral: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_integral) || 0) : null,
      rice_stock_branco: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_branco) || 0) : null,
      rice_integral_available: form.rice_stock_mode !== "branco",
    }
    ```
  - Para:
    ```ts
    const isRiceSplit = !isCombo && form.rice_stock_mode === "both"
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sku: form.sku.trim().toUpperCase() || null,
      price: Number(Number(form.price).toFixed(2)),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id || null,
      stock_type: form.stock_type,
      stock_quantity: isCombo || isRiceSplit ? 0 : Math.max(0, parseInt(form.stock_quantity) || 0),
      min_stock_alert: Math.max(1, parseInt(form.min_stock_alert) || 10),
      is_active: form.is_active,
      rice_stock_mode: isCombo ? "none" : form.rice_stock_mode,
      rice_stock_integral: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_integral) || 0) : null,
      rice_stock_branco: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_branco) || 0) : null,
      rice_integral_available: isCombo ? true : form.rice_stock_mode !== "branco",
    }
    ```
  - Logo depois do bloco que já existe (`if (saveError) { ... }` / `onSaved(data as ProductWithCat)`), inserir a sincronização de `combo_items` **antes** de `onSaved(data as ProductWithCat)`:
    ```ts
    if (isCombo) {
      const validRows = comboComponents
        .filter((row) => row.component_product_id && Number(row.quantity) > 0)
        .map((row) => ({
          combo_product_id: data.id,
          component_product_id: row.component_product_id,
          quantity: Math.max(1, parseInt(row.quantity) || 1),
        }))

      await sb.from("combo_items").delete().eq("combo_product_id", data.id)
      if (validRows.length > 0) {
        const { error: comboItemsError } = await sb.from("combo_items").insert(validRows)
        if (comboItemsError) {
          setError(`Produto salvo, mas houve erro na composição do combo: ${comboItemsError.message}`)
          setSaving(false)
          return
        }
      }
    }
    ```

- [ ] Trocar `typeOptions` do `ProductModal`:
  - De:
    ```ts
    const typeOptions: DropdownOption[] = [
      { value: "combo",  label: "Combo — reserva no checkout" },
      { value: "avulso", label: "Avulso — baixa na produção" },
    ]
    ```
  - Para:
    ```ts
    const typeOptions: DropdownOption[] = [
      { value: "individual", label: "Individual — produto único" },
      { value: "combo",      label: "Combo — pacote de produtos" },
    ]
    ```
  E o `onChange` do dropdown de tipo: `v as "combo" | "avulso"` → `v as "combo" | "individual"`.

- [ ] Envolver o par "Estoque de Arroz" + "Estoque Inicial/Alerta" (adicionados na Task 4) num `{!isCombo && (...)}`, e renderizar o `ComboComposer` quando `isCombo`:
  ```tsx
  {isCombo ? (
    <ComboComposer
      components={comboComponents}
      onChange={setComboComponents}
      individualProducts={individualProducts}
      comboOptions={comboOptions}
      onCopyFrom={handleCopyFrom}
    />
  ) : (
    <>
      {/* bloco "Estoque de Arroz" da Task 4 */}
      {/* bloco "Estoque Inicial + Alerta" da Task 4 */}
    </>
  )}
  ```

- [ ] No `EstoqueClient` (componente principal, fora do modal): trocar o `typeOptions` do filtro da listagem:
  - De:
    ```ts
    const typeOptions: DropdownOption[] = [
      { value: "all",    label: "Todos os tipos" },
      { value: "combo",  label: "Combos" },
      { value: "avulso", label: "Avulsos" },
    ]
    ```
  - Para:
    ```ts
    const typeOptions: DropdownOption[] = [
      { value: "all",        label: "Todos os tipos" },
      { value: "combo",      label: "Combos" },
      { value: "individual", label: "Individuais" },
    ]
    ```
- [ ] Ajustar as métricas (`okCount`/`lowCount`/`emptyCount`) pra ignorar combos — como `stock_quantity` de combo agora é sempre 0 (não representa mais nada até a composição ser cadastrada), contá-los junto faria o painel gritar "Esgotado" em massa de forma enganosa:
  - De:
    ```ts
    const okCount    = products.filter((p) => p.stock_quantity > p.min_stock_alert).length
    const lowCount   = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length
    const emptyCount = products.filter((p) => p.stock_quantity === 0).length
    ```
  - Para:
    ```ts
    const nonComboProducts = products.filter((p) => p.stock_type !== "combo")
    const okCount    = nonComboProducts.filter((p) => p.stock_quantity > p.min_stock_alert).length
    const lowCount   = nonComboProducts.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length
    const emptyCount = nonComboProducts.filter((p) => p.stock_quantity === 0).length
    ```
- [ ] Na renderização de cada linha da lista, evitar o alarme visual de "Esgotado" e o stepper (que não faz mais sentido pra combo) nas linhas de combo:
  - Trocar `const isEmpty  = qty === 0` / `const isLow = !isEmpty && qty <= product.min_stock_alert` por:
    ```ts
    const isCombo  = product.stock_type === "combo"
    const isEmpty  = !isCombo && qty === 0
    const isLow    = !isCombo && qty > 0 && qty <= product.min_stock_alert
    ```
  - No lugar de `{stepper}` (dois pontos de uso, desktop e mobile), trocar por:
    ```tsx
    {isCombo ? (
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-300)", flexShrink: 0 }}>
        Estoque dos componentes
      </span>
    ) : stepper}
    ```
  - Envolver `statusPill` com `{!isCombo && statusPill}` (o `comboTag` já comunica visualmente que é um combo — não precisa também do pill OK/Baixo/Esgotado, que ficaria sempre "Esgotado" até a composição ser cadastrada).

- [ ] Rodar `npx tsc --noEmit` — deve compilar limpo.
- [ ] Verificação manual: no painel `/admin/estoque`, criar um combo, adicionar 2 componentes com quantidades, salvar, reabrir pra editar e confirmar que a composição foi carregada de volta; testar "copiar composição de um combo existente" escolhendo o combo recém-criado a partir de outro novo combo.
- [ ] Commit: `git add src/components/admin/EstoqueClient.tsx && git commit -m "feat(admin): rename avulso->individual in UI, add combo composition editor with copy-from-existing"`

---

## Task 6 — Passo manual documentado: migração dos combos já existentes

**Files:**
- `supabase/scripts/list_combos_pending_composition.sql` (novo — script de leitura, não uma migration; não muda schema nem dados)

**Interfaces:**
- Consumes: `products.stock_type = 'combo'`, tabela `combo_items` (Task 1).
- Produces: nada em código — só o runbook abaixo, que é o "passo manual pós-deploy" explícito pedido.

**Steps:**

- [ ] Criar `supabase/scripts/list_combos_pending_composition.sql` (para rodar no SQL Editor sempre que quiser checar o progresso — não é aplicado automaticamente, não é uma migration numerada):
  ```sql
  -- Lista combos que ainda não têm composição cadastrada em combo_items.
  -- Não é possível preencher isso automaticamente: qual produto individual
  -- compõe cada combo é conhecimento de negócio que não está em nenhuma
  -- coluna existente. Rode esta query, e para cada linha retornada, edite
  -- o produto pelo painel /admin/estoque (botão de editar) e cadastre a
  -- composição na seção "Composição do Combo".
  SELECT p.id, p.name, p.sku, p.price
  FROM public.products p
  WHERE p.stock_type = 'combo'
    AND NOT EXISTS (
      SELECT 1 FROM public.combo_items ci WHERE ci.combo_product_id = p.id
    )
  ORDER BY p.name;
  ```
- [ ] **Passo manual pós-deploy (não automatizável, executado pelo dono do negócio depois que a Task 5 estiver em produção):**
  1. Rodar a query acima no Supabase SQL Editor para listar todos os combos sem composição.
  2. Para cada combo retornado, abrir `/admin/estoque`, localizar o produto, clicar em editar, e na seção "Composição do Combo" adicionar cada produto individual que compõe aquele combo com a quantidade correta (usando "copiar composição de um combo existente" quando dois combos compartilham a mesma base, ajustando o que for diferente).
  3. Salvar. Repetir a query do passo 1 até ela voltar vazia.
  4. **Enquanto um combo específico não tiver `combo_items`, ele pode ser vendido sem nenhuma baixa de estoque de componente nenhum** (ver o `console.warn` adicionado na Task 3) — recomenda-se priorizar primeiro os combos de maior volume de venda.
  - Este passo é 100% manual, feito por quem conhece a composição real de cada combo — nenhuma heurística de auto-associação foi criada, conforme pedido.
- [ ] Commit: `git add supabase/scripts/list_combos_pending_composition.sql && git commit -m "docs(ops): add read-only query to track legacy combos pending manual composition setup"`

---

## Task 7 — Testes e2e de integridade estoque↔pedido (arroz dividido + combo→componentes)

**Files:**
- `e2e/api-orders-stock-variants.spec.ts` (novo)

**Interfaces:**
- Consumes: `/api/orders` (Tasks 2 e 3), `products.rice_stock_mode`/`rice_stock_integral`/`rice_stock_branco`, tabela `combo_items` (Task 1).

**Steps:**

- [ ] Criar `e2e/api-orders-stock-variants.spec.ts`:

```ts
import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

function env() {
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      })
  )
}

function adminClient() {
  const e = env()
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const createdProductIds: string[] = []

async function createProduct(overrides: Record<string, unknown>) {
  const sb = adminClient()
  const { data, error } = await sb
    .from("products")
    .insert({
      name: `[E2E_TEST] Estoque Variante ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      price: 10,
      is_active: true,
      stock_type: "individual",
      stock_quantity: 0,
      min_stock_alert: 5,
      rice_stock_mode: "none",
      ...overrides,
    })
    .select()
    .single()
  if (error) throw new Error(`Falha ao criar produto de teste: ${error.message}`)
  createdProductIds.push(data.id)
  return data
}

function orderItem(product: { id: string; name: string; price: number }, quantity: number) {
  return {
    product: { id: product.id, name: product.name, sku: null, price: product.price, stock_type: "individual", category_id: null },
    quantity,
  }
}

test.afterEach(async () => {
  const sb = adminClient()
  const phones = ["41999995001", "41999995002", "41999995003", "41999995004"]
  const { data: orders } = await sb.from("orders").select("id").in("customer_phone", phones)
  const orderIds = (orders ?? []).map((o) => o.id)
  if (orderIds.length) {
    await sb.from("order_items").delete().in("order_id", orderIds)
    await sb.from("orders").delete().in("id", orderIds)
  }
  if (createdProductIds.length) {
    await sb.from("combo_items").delete().in("combo_product_id", createdProductIds)
    await sb.from("products").delete().in("id", createdProductIds)
    createdProductIds.length = 0
  }
})

test.describe("API /api/orders — integridade de estoque por tipo de arroz e combos", () => {
  test("rice_stock_mode='both': pedido de 'integral' baixa só rice_stock_integral", async ({ request }) => {
    const product = await createProduct({ rice_stock_mode: "both", rice_stock_integral: 5, rice_stock_branco: 5 })

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Arroz Integral E2E",
        customerPhone: "41999995001",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem(product, 2)],
        total: product.price * 2,
        riceChoices: { [product.id]: "integral" },
      },
    })
    expect(res.ok()).toBeTruthy()

    const sb = adminClient()
    const { data } = await sb.from("products").select("rice_stock_integral, rice_stock_branco").eq("id", product.id).single()
    expect(data?.rice_stock_integral).toBe(3)
    expect(data?.rice_stock_branco).toBe(5)
  })

  test("rice_stock_mode='both': estoque insuficiente no tipo escolhido bloqueia o pedido e não mexe no outro tipo", async ({ request }) => {
    const product = await createProduct({ rice_stock_mode: "both", rice_stock_integral: 1, rice_stock_branco: 10 })

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Arroz Insuficiente E2E",
        customerPhone: "41999995002",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem(product, 2)],
        total: product.price * 2,
        riceChoices: { [product.id]: "integral" },
      },
    })
    expect(res.ok()).toBeFalsy()
    expect(res.status()).toBe(409)

    const sb = adminClient()
    const { data } = await sb.from("products").select("rice_stock_integral, rice_stock_branco").eq("id", product.id).single()
    expect(data?.rice_stock_integral).toBe(1)
    expect(data?.rice_stock_branco).toBe(10)
  })

  test("combo: baixa o estoque de cada componente multiplicado pela quantidade do combo", async ({ request }) => {
    const componentA = await createProduct({ stock_quantity: 20 })
    const componentB = await createProduct({ stock_quantity: 20 })
    const combo = await createProduct({ stock_type: "combo", stock_quantity: 0 })

    const sb = adminClient()
    const { error: comboItemsErr } = await sb.from("combo_items").insert([
      { combo_product_id: combo.id, component_product_id: componentA.id, quantity: 2 },
      { combo_product_id: combo.id, component_product_id: componentB.id, quantity: 1 },
    ])
    expect(comboItemsErr).toBeNull()

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Combo E2E",
        customerPhone: "41999995003",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem({ ...combo, name: combo.name }, 3)],
        total: combo.price * 3,
      },
    })
    expect(res.ok()).toBeTruthy()

    const { data: products } = await sb.from("products").select("id, stock_quantity").in("id", [componentA.id, componentB.id])
    const byId = new Map((products ?? []).map((p) => [p.id, p.stock_quantity]))
    expect(byId.get(componentA.id)).toBe(20 - 2 * 3)
    expect(byId.get(componentB.id)).toBe(20 - 1 * 3)
  })

  test("combo: componente sem estoque suficiente bloqueia o pedido inteiro, sem baixar nenhum componente", async ({ request }) => {
    const componentA = await createProduct({ stock_quantity: 1 }) // precisa de 2 por combo — insuficiente
    const componentB = await createProduct({ stock_quantity: 20 })
    const combo = await createProduct({ stock_type: "combo", stock_quantity: 0 })

    const sb = adminClient()
    await sb.from("combo_items").insert([
      { combo_product_id: combo.id, component_product_id: componentA.id, quantity: 2 },
      { combo_product_id: combo.id, component_product_id: componentB.id, quantity: 1 },
    ])

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Combo Insuficiente E2E",
        customerPhone: "41999995004",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem({ ...combo, name: combo.name }, 1)],
        total: combo.price,
      },
    })
    expect(res.ok()).toBeFalsy()
    expect(res.status()).toBe(409)

    const { data: products } = await sb.from("products").select("id, stock_quantity").in("id", [componentA.id, componentB.id])
    const byId = new Map((products ?? []).map((p) => [p.id, p.stock_quantity]))
    // Componente B tinha estoque de sobra — mas como A falhou, o rollback
    // precisa desfazer a reserva de B também (atomicidade entre componentes
    // do MESMO combo, não só entre itens diferentes do pedido).
    expect(byId.get(componentA.id)).toBe(1)
    expect(byId.get(componentB.id)).toBe(20)
  })
})
```

- [ ] Rodar `npx playwright test e2e/api-orders-stock-variants.spec.ts --project=chromium` com o dev server ativo (`npm run dev` em outra janela, ou o mecanismo que os outros specs já assumem) e confirmar que os 4 testes passam.
- [ ] Rodar também `npx playwright test e2e/api-orders-integrity.spec.ts --project=chromium` e `npx playwright test e2e/admin-estoque.spec.ts --project=chromium` pra confirmar que nada quebrou nos fluxos existentes (avulso→individual não deveria mudar comportamento observável neles, já que os testes não dependem do valor literal do `stock_type` vindo do banco).
- [ ] Commit: `git add e2e/api-orders-stock-variants.spec.ts && git commit -m "test(e2e): cover rice-split stock and combo-component stock integrity in /api/orders"`

### Critical Files for Implementation
- src/app/api/orders/route.ts
- src/components/admin/EstoqueClient.tsx
- supabase/migrations/20260716_024_rice_stock_and_combo_items.sql
- supabase/migrations/20260716_025_individual_stock_type_rename.sql
- src/lib/supabase/database.types.ts