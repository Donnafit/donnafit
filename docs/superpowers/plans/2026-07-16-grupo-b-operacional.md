# Grupo B — Ajustes Operacionais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir três lacunas operacionais do painel admin e do checkout — quantidade de estoque não editável / avanço de status silenciosamente falho na cozinha, cadastro de produto fragmentado entre Estoque e Manual, e ausência de regra de frete mínimo de 8 marmitas.
**Architecture:** Next.js 14 App Router (client components `"use client"` + Server Components para fetch inicial), Supabase Postgres com RLS + funções RPC (`adjust_stock`, `reserve_stock`, `deduct_stock`) e um trigger de banco (`on_order_status_production`) para regras de estoque; Zustand (`useCart`) para estado do carrinho persistido em localStorage.
**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Playwright (e2e)

## Global Constraints

- Não existe Jest/Vitest neste projeto — toda verificação de comportamento é via Playwright e2e (`e2e/*.spec.ts`), rodado com `npx playwright test <arquivo> --project=chromium`. Fixtures ficam em `e2e/fixtures.ts` (`loadFixtures()`, `resetProductStock()`), credenciais de teste em `.env.local`, e o produto/admin/cliente de teste em `e2e/.fixtures.json` (gerado por `e2e/scripts/seed.mjs`).
- **Integridade estoque↔pedido é inegociável.** Depois de ler o código real (`src/app/api/orders/route.ts`, `supabase/migrations/20260602_003_stock_rpc.sql`, `supabase/migrations/20260602_004_production_trigger.sql`), o modelo *hoje* é: `reserve_stock` é chamado no checkout (POST `/api/orders`) para **todos** os itens do carrinho, independente de `stock_type` — isso foi uma correção deliberada e já testada (ver comentário em `route.ts`: "antes só combo era checado — avulso podia vender infinitamente além do estoque real"), então **não deve ser revertida**. Só que o trigger `on_order_status_production` (que baixa estoque de itens `avulso` quando o pedido entra em `production`) ficou redundante depois dessa correção e causa **dupla baixa** para produtos avulso. Task 1 corrige exatamente isso — ver seção "Contexto verificado" da Task 1 antes de mexer em qualquer coisa relacionada a estoque.
- Seguir o estilo existente: componentes admin usam `style={{...}}` inline (não Tailwind) com as variáveis CSS (`--surface-100`, `--gold-500`, `--font-ui`, etc.), dropdowns custom (`CustomDropdown`) em vez de `<select>` nativo, e Supabase client-side via `createClient()` de `@/lib/supabase/client`.
- Nenhuma mudança deve quebrar testes e2e existentes que já passam. Onde uma mudança de comportamento exige atualizar um teste existente (ex.: `checkout-delivery-fee.spec.ts` no Task 3), isso é declarado explicitamente como parte do escopo da task, nunca feito "de graça" sem explicação.
- Sem placeholders, sem TODOs vagos — qualquer limitação de escopo (ex.: modelo de arroz por variante) vira um comentário de código específico apontando pro plano que vai resolver (C16).

---

## Task 1 — B5/B9: Painel da cozinha — quantidade editável + status quebrado + dupla baixa de estoque

### Contexto verificado (leia antes de codar)

Explorei os 5 arquivos citados no brief e o resultado real diverge do que foi assumido — a task abaixo reflete o que **de fato** existe no código, não a suposição inicial:

1. **`src/components/kitchen/KitchenClient.tsx`** (fluxo "Registrar Produção" da cozinha) **já tem** um `<input type="number" placeholder="Qtd">` de digitação livre (linhas ~345-361), sem nenhum botão `+/-` nesse fluxo. B5 já está resolvido aqui — nada a fazer nesse arquivo.
2. O botão `+/-` que **não é editável por digitação** está em **`src/components/admin/EstoqueClient.tsx`** — o "stepper" de cada linha de produto (`Minus`/`Plus`, função `adjustQty`) só incrementa/decrementa de 1 em 1; o número entre os botões é um `<span>` estático. Essa é a lacuna real de "quantidade editável" (B5) — corrigida aqui trocando o `<span>` por um `<input>` que convive com os botões `+/-`.
3. **`src/components/admin/OrderKanban.tsx`**, **`src/components/admin/OrderModal.tsx`** e **`src/components/admin/OrderCard.tsx`** (citados no brief como o Kanban com botões que não respondem) são **código morto** — nenhuma rota ou componente ativo os importa (confirmado via `grep` em todo `src/`; o único lugar que referencia `OrderCard` é o próprio `OrderKanban.tsx`, e `git log` mostra que vieram do commit `cc5fdfc` — implementação antiga de Kanban — e foram substituídos pelo `OrderTable.tsx` + `OrderDetailPanel.tsx` atuais sem remover os arquivos velhos). Não vou apagá-los agora (fora de escopo — risco de referência oculta que eu não tenha achado), mas não é neles que o bug relatado pelo cliente pode estar, porque eles não renderizam em lugar nenhum.
4. O fluxo **real e ativo** de avançar status é `src/app/admin/(protected)/pedidos/page.tsx` → `OrderTable.tsx` (seleciona o pedido) → `src/components/admin/OrderDetailPanel.tsx` (botão "Iniciar Separação" / "Liberar Pedido" / etc., via `getNextStep()` de `src/lib/orderStatus.ts`) → `src/hooks/useRealtimeOrders.ts` (`updateStatus`). O e2e `e2e/admin-pedidos.spec.ts` já cobre o caminho feliz desse fluxo e passa. O bug real está em `useRealtimeOrders.ts`:
   ```ts
   const { error } = await (supabase.from("orders") as any).update({ status }).eq("id", orderId)
   if (error) { ... throw error }
   ```
   Um `UPDATE` do Supabase/PostgREST que casa **0 linhas** (por exemplo, RLS bloqueando por engano, ou o pedido ter sido removido/alterado por outra aba entre a seleção e o clique) **não retorna `error`** — só afeta 0 linhas silenciosamente. O código segue como se tivesse dado certo (fecha o modal), enquanto o banco não mudou nada. Na prática isso é visto pelo usuário como "cliquei e não aconteceu nada" — exatamente o sintoma relatado. `OrderDetailPanel.handleAdvance` já tem `try/catch` com banner de erro visível (`advanceError`) — ele só nunca é acionado porque o hook nunca lança erro nesse cenário. Correção: encadear `.select("id").single()` para forçar um erro detectável quando 0 linhas forem afetadas.
5. **Bug de dupla baixa de estoque (achado lendo `supabase/migrations/20260602_003_stock_rpc.sql` + `20260602_004_production_trigger.sql` + `src/app/api/orders/route.ts`):** hoje, para um item `avulso`: o checkout chama `reserve_stock` (decrementa 1x), e quando o admin avança o pedido para `production`, o trigger `on_order_status_production` chama `deduct_stock` (decrementa de novo). **Isso é dupla baixa real, não hipotética.** Para `combo` não há esse problema (o trigger só olha `stock_type = 'avulso'`). A correção é neutralizar a baixa do trigger (a baixa de checkout já cobre os dois tipos), mantendo `reserve_stock` como está (não pode regredir a proteção contra overselling que já tem teste e2e cobrindo — `e2e/api-orders-integrity.spec.ts`, teste "duas compras simultâneas do último item em estoque (avulso) não podem oversell").

### Files

- **Create:** `supabase/migrations/20260716_024_fix_avulso_double_stock_deduction.sql`
- **Modify:** `src/hooks/useRealtimeOrders.ts`
- **Modify:** `src/components/admin/EstoqueClient.tsx`
- **Test (extend):** `e2e/admin-pedidos.spec.ts`
- **Test (extend):** `e2e/admin-estoque.spec.ts`
- **Test (extend):** `e2e/api-orders-integrity.spec.ts`

### Interfaces

- **Consumes:** RPC `adjust_stock(p_product_id uuid, p_new_quantity int, p_notes text)` (já existe, `supabase/migrations/20260602_003_stock_rpc.sql`); tabela `orders` via `supabase.from("orders").update(...)`; trigger `on_order_status_production` / função `handle_order_production_stock()`.
- **Produces:** função `handle_order_production_stock()` atualizada (no-op de estoque, mantém o trigger existente por compatibilidade futura); `useRealtimeOrders().updateStatus` agora lança erro sempre que 0 linhas forem afetadas; `EstoqueClient` expõe input `aria-label="Quantidade de {nome}"` (role `spinbutton`) por linha de produto.

### Steps

- [ ] **1. Criar a migration que remove a dupla baixa de estoque para itens avulso.**

  Criar `supabase/migrations/20260716_024_fix_avulso_double_stock_deduction.sql`:
  ```sql
  -- ============================================================
  -- Donna FIT — Fix dupla baixa de estoque para itens avulso
  -- Migration: 20260716_024_fix_avulso_double_stock_deduction.sql
  -- Apply AFTER 20260602_004_production_trigger.sql
  --
  -- Problema: reserve_stock (chamado em POST /api/orders, todos os
  -- stock_type) já baixa estoque de itens avulso no checkout — isso foi
  -- adicionado depois do trigger abaixo existir, pra impedir overselling
  -- de avulso (ver comentário em src/app/api/orders/route.ts: "antes só
  -- combo era checado — avulso podia vender infinitamente além do
  -- estoque real"). Só que o trigger on_order_status_production
  -- (20260602_004) ainda baixa estoque de avulso DE NOVO quando o
  -- pedido entra em "production" — dupla baixa real para todo pedido
  -- avulso que é movido para produção pelo Kanban.
  --
  -- Fix: o trigger deixa de mexer em estoque (reserve_stock no checkout
  -- já cobre avulso e combo). Mantido como função vazia (não removido)
  -- caso uma automação futura de produção precise dele (ex: log de
  -- tempo de preparo, notificação) — só a baixa de estoque é retirada.
  -- ============================================================

  CREATE OR REPLACE FUNCTION public.handle_order_production_stock()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    -- Baixa de estoque (combo E avulso) já acontece em reserve_stock,
    -- chamado no checkout para todos os stock_type — ver
    -- src/app/api/orders/route.ts. Não duplicar aqui.
    RETURN NEW;
  END;
  $$;
  ```

- [ ] **2. Aplicar a migration no Supabase do projeto.**
  ```bash
  npx supabase db push
  ```
  (Ou o comando equivalente já usado neste projeto para aplicar migrations — confirme em `package.json`/README antes de rodar se `supabase db push` não for o fluxo padrão local.)

- [ ] **3. Corrigir a falha silenciosa em `useRealtimeOrders.ts`.**

  Em `src/hooks/useRealtimeOrders.ts`, substituir o corpo de `updateStatus`:
  ```ts
  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      const validStatus = status as NonNullable<OrderStatus>

      // Save previous state for rollback
      const previousOrders = orders

      // Optimistic update: apply locally before hitting Supabase.
      // fetchOrders always excludes 'cancelled', so drop it locally too —
      // otherwise it lingers in "Todos" until the next realtime refetch.
      setOrders((current) =>
        validStatus === "cancelled"
          ? current.filter((o) => o.id !== orderId)
          : current.map((o) => (o.id === orderId ? { ...o, status: validStatus } : o))
      )

      const supabase = createClient()
      // .select("id").single() é essencial aqui: um UPDATE que casa 0 linhas
      // (RLS bloqueando por engano, pedido removido/alterado por outra aba
      // entre a seleção e o clique) NÃO retorna erro no Supabase/PostgREST
      // se só checarmos `error` — a call "funciona" mas não muda nada no
      // banco, e o usuário vê o botão "não responder" (nada muda de verdade,
      // sem nenhum aviso). .single() força um erro detectável quando 0 (ou
      // mais de 1) linha for afetada.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("orders") as any)
        .update({ status })
        .eq("id", orderId)
        .select("id")
        .single()

      if (error || !data) {
        // Revert to previous state and surface the error
        setOrders(previousOrders)
        console.error("Erro ao atualizar status do pedido:", error)
        throw error ?? new Error("Nenhum pedido foi atualizado — verifique permissões ou se o pedido ainda existe.")
      }
    },
    [orders]
  )
  ```

- [ ] **4. Refatorar `adjustQty` em `EstoqueClient.tsx` para uma função compartilhada.**

  Em `src/components/admin/EstoqueClient.tsx`, substituir a função `adjustQty` (dentro de `EstoqueClient`, logo depois das declarações de `metrics`... na verdade logo antes) por:
  ```ts
  async function applyQty(product: ProductWithCat, newQty: number, notes: string) {
    const clamped = Math.max(0, newQty)
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock_quantity: clamped } : p)))
    setSaving((prev) => ({ ...prev, [product.id]: true }))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)("adjust_stock", {
      p_product_id: product.id,
      p_new_quantity: clamped,
      p_notes: notes,
    })
    setSaving((prev) => ({ ...prev, [product.id]: false }))
    setSaved((prev) => ({ ...prev, [product.id]: true }))
    startTransition(() => {
      setTimeout(() => setSaved((prev) => ({ ...prev, [product.id]: false })), 1500)
    })
  }

  async function adjustQty(product: ProductWithCat, delta: number) {
    await applyQty(product, product.stock_quantity + delta, "Ajuste manual — painel admin")
  }

  async function commitQtyInput(product: ProductWithCat, rawValue: string) {
    setQtyDraft((prev) => {
      const next = { ...prev }
      delete next[product.id]
      return next
    })
    const parsed = parseInt(rawValue, 10)
    if (Number.isNaN(parsed) || parsed === product.stock_quantity) return
    await applyQty(product, parsed, "Ajuste manual — digitado no painel admin")
  }
  ```

- [ ] **5. Adicionar o state de rascunho da quantidade digitada.**

  Ainda em `EstoqueClient.tsx`, no topo da função `EstoqueClient`, ao lado de `const [saved, setSaved] = useState<Record<string, boolean>>({})`, adicionar:
  ```ts
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({})
  ```

- [ ] **6. Trocar o `<span>` da quantidade por um `<input>` editável, mantendo os botões `+/-`.**

  Substituir o bloco `const stepper = (...)` inteiro por:
  ```tsx
  const stepper = (
    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
      <button
        onClick={() => adjustQty(product, -1)}
        disabled={qty === 0 || isSaving}
        aria-label={`Diminuir estoque de ${product.name}`}
        style={{
          width: 44, height: 44, borderRadius: 8,
          background: "var(--surface-200)", border: "none",
          cursor: qty === 0 || isSaving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: qty === 0 || isSaving ? 0.35 : 1, transition: "opacity 200ms",
        }}
      >
        <Minus size={14} strokeWidth={2.5} style={{ color: "var(--text-700)" }} />
      </button>

      <input
        type="number"
        min="0"
        inputMode="numeric"
        aria-label={`Quantidade de ${product.name}`}
        disabled={isSaving}
        value={qtyDraft[product.id] ?? String(qty)}
        onChange={(e) => setQtyDraft((prev) => ({ ...prev, [product.id]: e.target.value }))}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commitQtyInput(product, e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
        style={{
          width: 40, height: 44, border: "none", borderRadius: 6,
          background: "transparent",
          fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 900, textAlign: "center",
          color: isSaved ? "#10B981" : "var(--text-950)",
          outline: "none", transition: "color 200ms",
        }}
      />

      <button
        onClick={() => adjustQty(product, 1)}
        disabled={isSaving}
        aria-label={`Aumentar estoque de ${product.name}`}
        style={{
          width: 44, height: 44, borderRadius: 8,
          background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
          border: "none", cursor: isSaving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: isSaving ? 0.4 : 1, transition: "opacity 200ms",
        }}
      >
        <Plus size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
      </button>
    </div>
  )
  ```
  Isso preserva os testes existentes (`getByRole("button", { name: "Aumentar estoque de ..." })` continua funcionando) e adiciona um `input` acessível por `getByRole("spinbutton", { name: "Quantidade de ..." })`.

- [ ] **7. Estender `e2e/admin-pedidos.spec.ts` — reproduzir a falha silenciosa corrigida.**

  Adicionar ao final do `test.describe("Admin — Pedidos", ...)`:
  ```ts
  test("pedido removido concorrentemente: avançar status mostra erro em vez de fechar silenciosamente", async ({ page, request }) => {
    const customerName = `Pedido Painel E2E ${testRunId}-C`
    const { orderId } = await createTestOrder(request, customerName)
    await loginAdmin(page)
    await openOrderDetail(page, customerName)

    // Simula uma corrida: o pedido some do banco entre a abertura do painel
    // e o clique em avançar (ex.: outra aba já excluiu ou o realtime ainda
    // não refletiu). O UPDATE vai casar 0 linhas.
    const env = Object.fromEntries(
      fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      })
    )
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await sb.from("order_items").delete().eq("order_id", orderId)
    await sb.from("orders").delete().eq("id", orderId)

    await page.getByRole("button", { name: "Iniciar Separação" }).click()

    // Comportamento correto: mostra o banner de erro, não fecha silenciosamente.
    await expect(page.getByText(/não foi possível atualizar o status/i)).toBeVisible({ timeout: 5000 })
  })
  ```
  Ajustar `createTestOrder` (já existente no arquivo) para também retornar `orderId`:
  ```ts
  async function createTestOrder(request: import("@playwright/test").APIRequestContext, customerName: string) {
    const res = await request.post("/api/orders", {
      data: {
        customerName,
        customerPhone: `4199999${Math.floor(Math.random() * 9000 + 1000)}`,
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [{
          product: {
            id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`,
            price: fx.product.price, stock_type: "avulso", category_id: null,
          },
          quantity: 1,
        }],
        total: fx.product.price,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    return { ...body, orderId: body.orderId as string }
  }
  ```

- [ ] **8. Estender `e2e/admin-estoque.spec.ts` — quantidade digitável no stepper.**

  Adicionar ao `test.describe("Admin — Estoque", ...)`:
  ```ts
  test("digita uma quantidade nova no campo entre os +/- e persiste no banco", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill("E2E_TEST")

    const qtyInput = page.getByRole("spinbutton", { name: `Quantidade de ${fx.product.name}` })
    await qtyInput.fill("42")
    await qtyInput.blur()
    await page.waitForTimeout(600) // mesmo debounce de salvamento usado no teste do stepper

    const sb = adminClient()
    const { data } = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    expect(data?.stock_quantity).toBe(42)

    // devolve o estoque a um valor neutro pra não afetar specs que rodam depois
    await resetProductStock(fx.product.id, 10)
  })
  ```

- [ ] **9. Estender `e2e/api-orders-integrity.spec.ts` — sem dupla baixa e sem baixa perdida.**

  Adicionar ao final do `test.describe("API /api/orders — integridade de preço e estoque", ...)`:
  ```ts
  test("pedido avulso desconta estoque uma única vez no checkout — avançar para produção não desconta de novo", async ({ request }) => {
    const sb = adminClient()
    await sb.from("products").update({ stock_quantity: 10 }).eq("id", fx.product.id)

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Dupla Baixa Avulso E2E",
        customerPhone: "41999994444",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [baseItem({ quantity: 3 })], // stock_type: "avulso" (ver baseItem())
        total: fx.product.price * 3,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const { orderId } = await res.json()

    // Checkout já deve ter descontado 3 (baixa imediata, tanto pra combo
    // quanto pra avulso — proteção contra overselling, ver route.ts).
    const afterCheckout = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    expect(afterCheckout.data?.stock_quantity).toBe(7)

    // Avança o pedido para "production" — antes da correção, o trigger
    // on_order_status_production baixava esses mesmos 3 de novo (dupla baixa).
    await sb.from("orders").update({ status: "production" }).eq("id", orderId)

    const afterProduction = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    // Comportamento correto: continua 7 — nenhuma baixa adicional no trigger.
    expect(afterProduction.data?.stock_quantity).toBe(7)
  })

  test("pedido combo desconta estoque imediatamente no checkout e não é afetado ao avançar status", async ({ request }) => {
    const sb = adminClient()
    const { data: comboProduct } = await sb
      .from("products")
      .insert({
        name: `[E2E_TEST] Combo Dupla Baixa ${fx.runTag}`,
        sku: `E2E-COMBO-${fx.runTag}`,
        price: 30,
        stock_type: "combo",
        stock_quantity: 10,
        min_stock_alert: 2,
        is_active: true,
        sort_order: 9999,
      })
      .select()
      .single()

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Dupla Baixa Combo E2E",
        customerPhone: "41999993333",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [{
          product: { id: comboProduct!.id, name: comboProduct!.name, sku: comboProduct!.sku, price: 30, stock_type: "combo", category_id: null },
          quantity: 2,
        }],
        total: 60,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const { orderId } = await res.json()

    const afterCheckout = await sb.from("products").select("stock_quantity").eq("id", comboProduct!.id).single()
    expect(afterCheckout.data?.stock_quantity).toBe(8)

    await sb.from("orders").update({ status: "production" }).eq("id", orderId)

    const afterProduction = await sb.from("products").select("stock_quantity").eq("id", comboProduct!.id).single()
    expect(afterProduction.data?.stock_quantity).toBe(8)

    await sb.from("order_items").delete().eq("order_id", orderId)
    await sb.from("orders").delete().eq("id", orderId)
    await sb.from("products").delete().eq("id", comboProduct!.id)
  })
  ```
  Adicionar `import { createClient } from "@supabase/supabase-js"` já existe no topo do arquivo — reaproveitar `adminClient()` já definido nele.

- [ ] **10. Rodar os testes afetados.**
  ```bash
  npx playwright test e2e/admin-pedidos.spec.ts e2e/admin-estoque.spec.ts e2e/api-orders-integrity.spec.ts e2e/admin-cozinha.spec.ts --project=chromium
  ```

- [ ] **11. Commit.**
  ```bash
  git add supabase/migrations/20260716_024_fix_avulso_double_stock_deduction.sql src/hooks/useRealtimeOrders.ts src/components/admin/EstoqueClient.tsx e2e/admin-pedidos.spec.ts e2e/admin-estoque.spec.ts e2e/api-orders-integrity.spec.ts
  git commit -m "fix(admin): quantidade de estoque editável por digitação, avanço de status silenciosamente falho e dupla baixa de estoque avulso"
  ```

---

## Task 2 — B7/B12/B13: Consolidar ingrediente/preparo/tipo-de-arroz no cadastro de produto

### Contexto verificado

- `src/components/admin/EstoqueClient.tsx` (modal `ProductModal`, criar/editar produto) hoje só tem um campo genérico "Descrição" (placeholder já sugere "Ingredientes, informações nutricionais, modo de preparo…") ligado à coluna `description`. Não existe campo de `prep_instructions` nem seletor de arroz nesse formulário.
- `src/components/admin/ManualClient.tsx` (rota `/admin/manual`) já edita `prep_instructions` de produtos existentes — mas só depois de já cadastrados via Estoque, e sem seletor de arroz.
- Schema real confirmado em `src/lib/supabase/database.types.ts` e nas migrations: coluna `description` (text, existe desde o schema inicial) e coluna `prep_instructions` (text, `supabase/migrations/20260609_009_prep_instructions.sql`) já existem — **não precisa de coluna nova para ingredientes**, ela já é a `description`. Coluna `rice_integral_available` (`boolean not null default true`, `supabase/migrations/20260710_022_rice_integral_availability.sql`) já existe e é o único campo de "tipo de arroz" hoje: `true` = "integral e branco, cliente escolhe no checkout" (ver `CheckoutForm.tsx`, linhas 151-181), `false` = "só branco, sistema já força a escolha". Não existe modelo de estoque por variante de arroz (`rice_stock_integral`/`rice_stock_branco`) ainda — isso é o plano C16, fora de escopo aqui.
- `EstoquePage` (`src/app/admin/(protected)/estoque/page.tsx`) já faz `select("*", ...)`, então `prep_instructions` e `rice_integral_available` já chegam no componente sem precisar mudar a query do servidor.
- `/admin/manual` **é mantida** como está — não é escopo desta task removê-la. Ela continua sendo o atalho rápido para editar só o modo de preparo de um produto já cadastrado, sem abrir o modal completo de estoque.

### Files

- **Modify:** `src/components/admin/EstoqueClient.tsx`
- **Test (extend):** `e2e/admin-estoque.spec.ts`

### Interfaces

- **Consumes:** colunas `products.description`, `products.prep_instructions`, `products.rice_integral_available` (todas já existentes, confirmadas no schema).
- **Produces:** `ProductModal` em `EstoqueClient.tsx` agora grava `prep_instructions` e `rice_integral_available` junto com o resto do produto, no mesmo submit de criar/editar.

### Steps

- [ ] **1. Estender a interface `ProductWithCat`.**

  Em `src/components/admin/EstoqueClient.tsx`, atualizar a interface (topo do arquivo):
  ```ts
  interface ProductWithCat {
    id: string
    name: string
    sku: string | null
    description: string | null
    prep_instructions: string | null
    price: number
    category_id: string | null
    is_active: boolean
    stock_quantity: number
    min_stock_alert: number
    stock_type: "combo" | "avulso"
    rice_integral_available: boolean
    image_url: string | null
    categories: { name: string; slug: string } | null
  }
  ```

- [ ] **2. Estender o `form` state do `ProductModal` com os novos campos.**

  Dentro de `ProductModal`, no `useState(form)`, adicionar:
  ```ts
  const [form, setForm] = useState({
    name: productToEdit?.name ?? "",
    description: productToEdit?.description ?? "",
    prep_instructions: productToEdit?.prep_instructions ?? "",
    sku: productToEdit?.sku ?? "",
    price: productToEdit?.price?.toString() ?? "",
    image_url: productToEdit?.image_url ?? "",
    category_id: productToEdit?.category_id ?? "",
    stock_type: productToEdit?.stock_type ?? "combo",
    rice_integral_available: productToEdit?.rice_integral_available ?? true,
    stock_quantity: productToEdit?.stock_quantity?.toString() ?? "0",
    min_stock_alert: productToEdit?.min_stock_alert?.toString() ?? "10",
    is_active: productToEdit?.is_active ?? true,
  })
  ```

- [ ] **3. Definir as opções do seletor de tipo de arroz.**

  Logo abaixo de `const typeOptions: DropdownOption[] = [...]` (dentro de `ProductModal`), adicionar:
  ```ts
  // Tipo de arroz servido — SÓ o seletor aqui. Hoje só existe a coluna
  // booleana rice_integral_available (true = "ambos, cliente escolhe no
  // checkout"; false = "só branco"). O modelo de estoque por variante de
  // arroz (rice_stock_integral / rice_stock_branco, incluindo "nenhum" e
  // "só integral" como opções reais) é outro plano (C16 — estoque de arroz
  // + combos). Quando essa migração existir, trocar este seletor de 2 pra
  // 4 opções e ligar na coluna nova em vez do booleano.
  const riceOptions: DropdownOption[] = [
    { value: "both",   label: "Integral e branco — cliente escolhe no checkout" },
    { value: "branco", label: "Somente arroz branco" },
  ]
  ```

- [ ] **4. Trocar o campo único "Descrição" por "Ingredientes" + novo campo "Modo de Preparo".**

  Substituir o bloco:
  ```tsx
  {/* Descrição */}
  <div>
    <label style={labelStyle}>Descrição</label>
    <textarea className="modal-input" style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
      placeholder="Ingredientes, informações nutricionais, modo de preparo…"
      value={form.description}
      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
  </div>
  ```
  por:
  ```tsx
  {/* Ingredientes */}
  <div>
    <label style={labelStyle}>Ingredientes</label>
    <textarea className="modal-input" style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
      placeholder="Ex: Peito de frango grelhado, arroz integral, brócolis no vapor, cenoura"
      value={form.description}
      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
  </div>

  {/* Modo de Preparo */}
  <div>
    <label style={labelStyle}>Modo de Preparo</label>
    <textarea className="modal-input" style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
      placeholder="Ex: Descongelar 24h na geladeira. Aquecer no microondas por 3 minutos em potência média..."
      value={form.prep_instructions}
      onChange={(e) => setForm((f) => ({ ...f, prep_instructions: e.target.value }))} />
    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 6 }}>
      Também pode ser editado depois em Admin → Manual de Preparo.
    </p>
  </div>
  ```
  (mantém a mesma coluna `description` para ingredientes — confirmado no schema, sem precisar de coluna nova — e usa a coluna `prep_instructions` já existente para modo de preparo).

- [ ] **5. Adicionar o seletor de tipo de arroz logo após "Categoria + Tipo".**

  Depois do bloco `{/* Categoria + Tipo */}` (grid com `CustomDropdown` de categoria e tipo de estoque), adicionar:
  ```tsx
  {/* Tipo de arroz servido */}
  <div>
    <label style={labelStyle}>Tipo de Arroz Servido</label>
    <CustomDropdown
      value={form.rice_integral_available ? "both" : "branco"}
      onChange={(v) => setForm((f) => ({ ...f, rice_integral_available: v === "both" }))}
      options={riceOptions}
    />
    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 6 }}>
      Só vale para pratos com arroz (identificado pela palavra "arroz" no campo Ingredientes).
    </p>
  </div>
  ```

- [ ] **6. Incluir os novos campos no payload de salvar.**

  Em `handleSubmit`, no objeto `payload`, adicionar:
  ```ts
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    prep_instructions: form.prep_instructions.trim() || null,
    sku: form.sku.trim().toUpperCase() || null,
    price: Number(Number(form.price).toFixed(2)),
    image_url: form.image_url.trim() || null,
    category_id: form.category_id || null,
    stock_type: form.stock_type,
    rice_integral_available: form.rice_integral_available,
    stock_quantity: Math.max(0, parseInt(form.stock_quantity) || 0),
    min_stock_alert: Math.max(1, parseInt(form.min_stock_alert) || 10),
    is_active: form.is_active,
  }
  ```
  (o `.select("*, categories(name, slug)").single()` logo abaixo já retorna todas as colunas via `*`, nada a mudar ali.)

- [ ] **7. Estender `e2e/admin-estoque.spec.ts` — criar produto com ingredientes, preparo e tipo de arroz.**

  Adicionar ao `test.describe("Admin — Estoque", ...)`:
  ```ts
  test("cria produto com ingredientes, modo de preparo e tipo de arroz, e os dados persistem", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /novo produto/i }).click()

    const productName = `${newProductName} — Arroz`
    await page.getByPlaceholder(/frango grelhado/i).fill(productName)
    await page.getByPlaceholder("0,00").fill("22.50")
    await page.getByPlaceholder(/peito de frango grelhado, arroz integral/i)
      .fill("Peito de frango grelhado, arroz branco, brócolis no vapor")
    await page.getByPlaceholder(/descongelar 24h/i)
      .fill("Descongelar na geladeira por 24h. Aquecer no microondas por 3 minutos.")

    // Tipo de arroz: troca do padrão "Integral e branco" para "Somente arroz branco"
    await page.getByRole("button", { name: /integral e branco — cliente escolhe no checkout/i }).click()
    await page.getByRole("button", { name: /^somente arroz branco$/i }).click()

    await page.getByRole("button", { name: /adicionar ao cardápio/i }).click()
    await expect(page.getByText("Preencha os dados para adicionar ao cardápio")).not.toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data } = await sb
      .from("products")
      .select("prep_instructions, rice_integral_available, description")
      .eq("name", productName)
      .single()
    expect(data?.prep_instructions).toContain("Descongelar na geladeira")
    expect(data?.description).toContain("brócolis")
    expect(data?.rice_integral_available).toBe(false)

    await sb.from("products").delete().eq("name", productName)
  })

  test("edita produto existente e persiste ingredientes/modo de preparo alterados", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill(fx.product.name)
    await page.getByRole("button", { name: `Editar ${fx.product.name}` }).first().click()

    const prepText = `Instruções E2E ${fx.runTag}`
    await page.getByPlaceholder(/descongelar 24h/i).fill(prepText)
    await page.getByRole("button", { name: /salvar alterações/i }).click()
    await expect(page.getByText("Edite os detalhes do produto abaixo")).not.toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data } = await sb.from("products").select("prep_instructions").eq("id", fx.product.id).single()
    expect(data?.prep_instructions).toBe(prepText)
  })
  ```

- [ ] **8. Rodar os testes.**
  ```bash
  npx playwright test e2e/admin-estoque.spec.ts --project=chromium
  ```

- [ ] **9. Commit.**
  ```bash
  git add src/components/admin/EstoqueClient.tsx e2e/admin-estoque.spec.ts
  git commit -m "feat(admin): consolida ingredientes, modo de preparo e tipo de arroz no cadastro de produto do Estoque"
  ```

---

## Task 3 — B14: Aviso de frete mínimo (8 marmitas)

### Contexto verificado

- Estado do carrinho: `src/hooks/useCart.ts` (Zustand + `persist`). Itens têm `{ product, quantity }`; total de marmitas = soma de `quantity` de todos os itens.
- Escolha de entrega/retirada acontece só em `src/components/checkout/CheckoutForm.tsx` (estado local `delivery: "pickup" | "delivery"`, seção "2. Forma de entrega"). O drawer de carrinho (`src/components/ui/CartDrawer.tsx`, o que de fato é renderizado — importado por `src/components/catalog/Header.tsx` e com `data-testid="cart-drawer"`; **existe também** um `src/components/cart/CartDrawer.tsx` não utilizado por nenhum componente ativo, que não será tocado) não tem seletor de entrega, só mostra "Entrega: a calcular" — é o local certo pra um aviso informativo (não há o que "desabilitar" ali, pois a escolha ainda nem foi feita).
- A regra de negócio (mínimo 8 marmitas pra liberar entrega) só pode de fato **bloquear** a opção no Checkout, onde a escolha delivery/pickup existe.
- **Efeito colateral a tratar:** `CheckoutForm.tsx` tem um `useEffect` que auto-seta `delivery("delivery")` quando o usuário logado ou convidado já tem um `delivery_address` salvo de pedido anterior (linhas 39-78). Isso pode setar `delivery = "delivery"` mesmo com carrinho abaixo de 8 — preciso de um segundo `useEffect` que força de volta pra `"pickup"` sempre que o carrinho cair abaixo do mínimo enquanto `delivery === "delivery"`.
- **Teste existente que quebra sem ajuste:** `e2e/checkout-delivery-fee.spec.ts`, função `addToCartAndGoToCheckout`, adiciona só **1 unidade** do produto de teste e depois clica em "Entrega". Com a regra de mínimo 8, esse clique passa a estar bloqueado e os 3 testes desse describe quebram. Vou ajustar essa função para adicionar 8 unidades antes de ir pro checkout — é uma mudança necessária e está listada como parte desta task.

### Files

- **Modify:** `src/hooks/useCart.ts`
- **Modify:** `src/components/checkout/CheckoutForm.tsx`
- **Modify:** `src/components/ui/CartDrawer.tsx`
- **Modify:** `e2e/checkout-delivery-fee.spec.ts`
- **Create:** `e2e/checkout-min-delivery.spec.ts`

### Interfaces

- **Consumes:** `useCart()` (`items`, `total`), estado local `delivery` do `CheckoutForm`.
- **Produces:** `MIN_DELIVERY_ITEMS` exportado de `src/hooks/useCart.ts`, consumido por `CheckoutForm.tsx` e `CartDrawer.tsx`.

### Steps

- [ ] **1. Exportar a constante de mínimo de marmitas para entrega.**

  Em `src/hooks/useCart.ts`, logo abaixo dos imports:
  ```ts
  // Frete só é oferecido a partir desta quantidade total de marmitas no carrinho.
  export const MIN_DELIVERY_ITEMS = 8
  ```

- [ ] **2. Calcular a quantidade total e travar a opção de entrega em `CheckoutForm.tsx`.**

  Adicionar o import:
  ```ts
  import { useCart, MIN_DELIVERY_ITEMS } from "@/hooks/useCart"
  ```
  Logo abaixo de `const subtotal = mounted ? total() : 0` (dentro de `CheckoutForm`), adicionar:
  ```ts
  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const deliveryLocked = totalQty < MIN_DELIVERY_ITEMS
  ```
  Logo depois do `useEffect` que faz o fetch de `zones`/`store_settings` (o que termina em `}, [])`), adicionar um novo `useEffect`:
  ```ts
  // Se o carrinho cair abaixo do mínimo (item removido, ou auto-preenchimento
  // de endereço salvo de pedido anterior tiver marcado "delivery" por engano),
  // força de volta pra retirada — nunca deixa "delivery" selecionado sem
  // atingir o mínimo de marmitas.
  useEffect(() => {
    if (deliveryLocked && delivery === "delivery") {
      setDelivery("pickup")
      setAddressState("idle")
    }
  }, [deliveryLocked, delivery])
  ```

- [ ] **3. Desabilitar o botão "Entrega" e mostrar o motivo quando travado.**

  Substituir o botão de "Entrega" (dentro de "Secao: Entrega"):
  ```tsx
  {/* Entrega */}
  <button
    type="button"
    onClick={() => { if (!deliveryLocked) setDelivery("delivery") }}
    disabled={deliveryLocked}
    className={`option-card ${delivery === "delivery" ? "selected" : ""}`}
    style={deliveryLocked ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
  >
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
      <Truck size={28} style={{ color: "#C89B3C" }} />
    </div>
    <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 4 }}>Entrega</div>
    <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>
      {deliveryLocked
        ? `Mínimo ${MIN_DELIVERY_ITEMS} marmitas`
        : matchedZone ? `+ ${formatCurrency(matchedZone.fee)}` : "Varia por bairro"}
    </div>
    <div className="option-check">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
    </div>
  </button>
  ```

- [ ] **4. Adicionar o banner de aviso na seção "Forma de entrega" do Checkout.**

  Logo após o `<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", ...}}>` que contém os dois botões Retirada/Entrega (antes do bloco `{delivery === "delivery" && (...)}` do campo de endereço), adicionar:
  ```tsx
  {deliveryLocked && (
    <div style={{
      marginTop: 14, background: "#FFF7E6", border: "1.5px solid #F5D98B",
      borderRadius: 12, padding: "12px 14px",
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#B45309" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p style={{ fontSize: 12.5, color: "#92400E", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
        Frete disponível a partir de {MIN_DELIVERY_ITEMS} marmitas — faltam{" "}
        {MIN_DELIVERY_ITEMS - totalQty} para liberar a entrega. Por enquanto, escolha retirada.
      </p>
    </div>
  )}
  ```

- [ ] **5. Adicionar o mesmo aviso no drawer de carrinho do cardápio.**

  Em `src/components/ui/CartDrawer.tsx`, adicionar o import:
  ```ts
  import { useCart, MIN_DELIVERY_ITEMS } from "@/hooks/useCart"
  ```
  Dentro do `Footer`, logo após o `<div>` do "Subtotal" e antes do `<div>` de "Entrega: a calcular", adicionar:
  ```tsx
  {itemCount > 0 && itemCount < MIN_DELIVERY_ITEMS && (
    <div style={{
      background: "#FFF7E6", border: "1.5px solid #F5D98B",
      borderRadius: 10, padding: "9px 12px", marginBottom: 14,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#B45309" strokeWidth={2} style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 11, color: "#92400E", fontWeight: 600 }}>
        Frete a partir de {MIN_DELIVERY_ITEMS} marmitas — faltam {MIN_DELIVERY_ITEMS - itemCount} para liberar a entrega
      </span>
    </div>
  )}
  ```

- [ ] **6. Ajustar `e2e/checkout-delivery-fee.spec.ts` para o novo mínimo (evita quebrar os 3 testes existentes).**

  Substituir a função `addToCartAndGoToCheckout`:
  ```ts
  async function addToCartAndGoToCheckout(page: import("@playwright/test").Page) {
    await login(page)
    await page.goto(`/produto/${fx.product.id}`)
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    // Frete mínimo de 8 marmitas (B14) — sem isso, o botão "Entrega" abaixo
    // fica desabilitado e os testes deste describe quebram.
    for (let i = 1; i < 8; i++) {
      await page.getByRole("button", { name: "Adicionar mais um" }).click()
    }
    await page.getByRole("button", { name: "Carrinho" }).first().click()
    await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
    await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
    await expect(page).toHaveURL(/\/checkout/, { timeout: 10_000 })
    await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Frete E2E")
    await page.getByPlaceholder("(41) 99999-9999").fill("41999997777")
    await page.getByRole("button", { name: /^Entrega/ }).click()
  }
  ```

- [ ] **7. Criar `e2e/checkout-min-delivery.spec.ts`.**
  ```ts
  import { test, expect } from "@playwright/test"
  import { loadFixtures, resetProductStock } from "./fixtures"

  const fx = loadFixtures()

  test.beforeAll(async () => {
    await resetProductStock(fx.product.id, 100)
  })

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/")
    await page.getByRole("button", { name: "Perfil" }).click()
    await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
    await page.getByPlaceholder("••••••••").fill(fx.customer.password)
    await page.locator("form").getByRole("button", { name: "Entrar" }).click()
    await page.waitForTimeout(500)
  }

  async function addQuantity(page: import("@playwright/test").Page, quantity: number) {
    await page.goto(`/produto/${fx.product.id}`)
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    for (let i = 1; i < quantity; i++) {
      await page.getByRole("button", { name: "Adicionar mais um" }).click()
    }
  }

  async function addQuantityAndGoToCheckout(page: import("@playwright/test").Page, quantity: number) {
    await login(page)
    await addQuantity(page, quantity)
    await page.getByRole("button", { name: "Carrinho" }).first().click()
    await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
    await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
    await expect(page).toHaveURL(/\/checkout/, { timeout: 10_000 })
    await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Frete Minimo E2E")
    await page.getByPlaceholder("(41) 99999-9999").fill("41999996000")
  }

  test.describe("Checkout — frete mínimo de 8 marmitas", () => {
    test("carrinho com 5 marmitas mostra aviso e bloqueia a opção de entrega", async ({ page }) => {
      await addQuantityAndGoToCheckout(page, 5)
      await expect(page.getByText(/frete disponível a partir de 8 marmitas/i)).toBeVisible()
      await expect(page.getByText(/faltam 3 para liberar a entrega/i)).toBeVisible()
      await expect(page.getByRole("button", { name: /^Entrega/ })).toBeDisabled()
    })

    test("carrinho com 8 marmitas libera a opção de entrega normalmente", async ({ page }) => {
      await addQuantityAndGoToCheckout(page, 8)
      await expect(page.getByText(/frete disponível a partir de 8 marmitas/i)).not.toBeVisible()
      const entregaBtn = page.getByRole("button", { name: /^Entrega/ })
      await expect(entregaBtn).toBeEnabled()
      await entregaBtn.click()
      await expect(page.getByPlaceholder(/rua, número, bairro, complemento/i)).toBeVisible()
    })

    test("aviso de frete mínimo também aparece no resumo do carrinho no cardápio", async ({ page }) => {
      await login(page)
      await addQuantity(page, 5)
      await page.getByRole("button", { name: "Carrinho" }).first().click()
      await expect(page.getByTestId("cart-drawer").getByText(/frete a partir de 8 marmitas/i)).toBeVisible({ timeout: 5000 })
    })
  })
  ```

- [ ] **8. Rodar os testes afetados.**
  ```bash
  npx playwright test e2e/checkout-min-delivery.spec.ts e2e/checkout-delivery-fee.spec.ts --project=chromium
  ```

- [ ] **9. Commit.**
  ```bash
  git add src/hooks/useCart.ts src/components/checkout/CheckoutForm.tsx src/components/ui/CartDrawer.tsx e2e/checkout-delivery-fee.spec.ts e2e/checkout-min-delivery.spec.ts
  git commit -m "feat(checkout): exige mínimo de 8 marmitas para liberar a opção de entrega, com aviso no cardápio e no checkout"
  ```

### Critical Files for Implementation
- src/hooks/useRealtimeOrders.ts
- src/app/api/orders/route.ts
- supabase/migrations/20260602_004_production_trigger.sql
- src/components/admin/EstoqueClient.tsx
- src/components/checkout/CheckoutForm.tsx
- src/components/ui/CartDrawer.tsx
- e2e/api-orders-integrity.spec.ts
