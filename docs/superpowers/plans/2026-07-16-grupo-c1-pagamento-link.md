# Pagamento com Link de Cartão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma terceira forma de pagamento no checkout — "Cartão (link de pagamento)" — que não aplica nenhum desconto, exibe um aviso de que o link será enviado manualmente pelo WhatsApp após a confirmação do pedido, e aparece corretamente rotulada em todos os pontos que hoje exibem a forma de pagamento (checkout, mensagem de WhatsApp, página de confirmação e telas administrativas de pedidos). Não há nenhuma integração com gateway de pagamento — é só rotulagem/roteamento de UI e dados.

**Architecture:** O projeto já modela `payment_method` como um enum de string (`"pix" | "card"`) espelhado em 3 camadas: (1) `CHECK` constraint no Postgres (`orders.payment_method`, `customer_profiles.preferred_payment` — este último tipado como `string` solto, sem união), (2) `Database["public"]["Tables"]["orders"]` em `database.types.ts` (de onde `src/types/index.ts` deriva `PaymentMethod` via `Order["payment_method"]`), e (3) tipos locais duplicados em `CheckoutForm.tsx`, `api/orders/route.ts` e `whatsapp.ts` (`"pix" | "card"` cada um, sem importar um tipo compartilhado). A feature entra como um terceiro valor literal, `"card_link"`, propagado em todas essas camadas — sem criar nenhuma abstração nova (o projeto explicitamente evita extrair componentes/helpers compartilhados para fixes pontuais, ver spec de referência). O fluxo de dados é: `CheckoutForm` (estado `payment`) → `POST /api/orders` (grava `payment_method` na tabela `orders`, valida contra whitelist) → `buildWhatsAppMessage` (monta o texto que vai pro WhatsApp) → páginas/telas de leitura (`confirmacao`, `OrderModal`, `OrderDetailPanel`, `OrderCard`, `FiscalCopyButton`) que apenas exibem o valor já gravado.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Playwright (e2e)

## Global Constraints
- Sem gateway de pagamento real — o link continua sendo enviado manualmente por um humano via WhatsApp; nenhuma integração de processamento de pagamento é criada.
- `card_link` nunca aplica desconto — mesmo tratamento que `card` (Maquininha): só `payment === "pix"` calcula `pixDiscount`.
- O enum/type existente de `paymentMethod` (`"pix" | "card"`) é estendido para `"pix" | "card" | "card_link"` em **todos** os pontos que o consomem: `database.types.ts` (fonte de `src/types/index.ts#PaymentMethod`), `CheckoutForm.tsx`, `src/app/api/orders/route.ts`, `src/lib/whatsapp.ts`, `src/app/confirmacao/page.tsx`, e as telas admin que exibem forma de pagamento: `OrderModal.tsx`, `OrderDetailPanel.tsx`, `OrderCard.tsx`, `FiscalCopyButton.tsx`.
- Constraint no banco (`orders.payment_method`, `customer_profiles.preferred_payment`) precisa ser atualizada via migration antes/junto do deploy do código — sem isso, o insert do pedido falha com violação de `CHECK`.
- Sem testes unitários (Jest/Vitest não existem no projeto) — cobertura via Playwright e2e em `e2e/*.spec.ts`, rodado com `npx playwright test <arquivo> --project=chromium`.
- Não criar componente/helper compartilhado novo para rotular pagamento — seguir o padrão existente de ternário pontual em cada arquivo consumidor (é a convenção já adotada no projeto para esse tipo de fix).
---

## Task 1: Schema, tipos e UI de seleção no checkout

**Files:**
- `supabase/migrations/20260716_024_card_link_payment.sql` (novo)
- `src/lib/supabase/database.types.ts`
- `src/components/checkout/CheckoutForm.tsx`

**Interfaces:**
```ts
// database.types.ts — orders.Row / Insert / Update
payment_method: "pix" | "card" | "card_link"   // Row (era "pix" | "card")
payment_method: "pix" | "card" | "card_link"   // Insert
payment_method?: "pix" | "card" | "card_link"  // Update

// CheckoutForm.tsx
const [payment, setPayment] = useState<"pix" | "card" | "card_link">("pix")
```

### Steps

- [ ] **1.1 — Migration: liberar `card_link` nas constraints do banco**

  Os dois `CHECK` inline existentes foram criados sem nome explícito em `20260602_001_initial_schema.sql` (`orders.payment_method`) e `20260608_006_customer_profiles.sql` (`customer_profiles.preferred_payment`), então o Postgres já os nomeou automaticamente como `orders_payment_method_check` e `customer_profiles_preferred_payment_check`. Criar `supabase/migrations/20260716_024_card_link_payment.sql`:

  ```sql
  -- ============================================================
  -- Donna FIT — Pagamento com link de cartão (novo método,
  -- rotulagem apenas — sem integração de gateway)
  -- Migration: 20260716_024_card_link_payment.sql
  --
  -- Libera "card_link" nas mesmas duas constraints que hoje só
  -- aceitam 'pix' e 'card': orders.payment_method (forma de
  -- pagamento gravada por pedido) e customer_profiles.preferred_payment
  -- (última forma de pagamento usada pelo cliente, some no upsert
  -- de perfil em api/orders/route.ts).
  -- ============================================================

  alter table public.orders
    drop constraint orders_payment_method_check;
  alter table public.orders
    add constraint orders_payment_method_check
    check (payment_method in ('pix', 'card', 'card_link'));

  alter table public.customer_profiles
    drop constraint customer_profiles_preferred_payment_check;
  alter table public.customer_profiles
    add constraint customer_profiles_preferred_payment_check
    check (preferred_payment in ('pix', 'card', 'card_link'));
  ```

  Aplicar via **Supabase Dashboard → SQL Editor → paste and Run**, no mesmo projeto usado pelos testes e2e (mesmas credenciais de `.env.local`), seguindo o padrão descrito em `supabase/README.md`. Sem essa migration aplicada antes do Task 2/3, qualquer pedido com `paymentMethod: "card_link"` falha com erro 500 no insert (violação de `CHECK`).

- [ ] **1.2 — `database.types.ts`: estender o union type de `payment_method`**

  Em `src/lib/supabase/database.types.ts`, trocar as 3 ocorrências de `payment_method` da tabela `orders` (linhas 217, 233, 249):

  ```ts
  // Row (linha 217)
  payment_method: "pix" | "card" | "card_link"

  // Insert (linha 233)
  payment_method: "pix" | "card" | "card_link"

  // Update (linha 249)
  payment_method?: "pix" | "card" | "card_link"
  ```

  Não mexer em `customer_profiles.preferred_payment` (linhas 116, 130, 144) — já é tipado como `string` solto, sem união, então continua aceitando qualquer valor validado pela API.

  Isso propaga automaticamente para `src/types/index.ts`, que já deriva `export type PaymentMethod = Order["payment_method"]` — nenhuma edição extra necessária nesse arquivo.

- [ ] **1.3 — `CheckoutForm.tsx`: novo import de ícone e tipo do estado `payment`**

  Trocar o import de ícones (linha 10):
  ```ts
  import { Store, Truck, QrCode, CreditCard, Check } from "lucide-react"
  ```
  por:
  ```ts
  import { Store, Truck, QrCode, CreditCard, Check, Link2, Info } from "lucide-react"
  ```

  Trocar o estado do pagamento (linha 142):
  ```ts
  const [payment, setPayment] = useState<"pix" | "card">("pix")
  ```
  por:
  ```ts
  const [payment, setPayment] = useState<"pix" | "card" | "card_link">("pix")
  ```

  Nenhuma mudança é necessária em `pixDiscount` (linha 191: `payment === "pix" ? subtotal * pixDiscountRate : 0`) — `card_link` já cai no `else` (desconto zero), igual `card` hoje.

- [ ] **1.4 — `CheckoutForm.tsx`: terceiro card de pagamento + grid de 3 colunas**

  Trocar o grid da seção "Forma de pagamento" (linha 517), de 2 para 3 colunas:
  ```tsx
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
  ```
  por:
  ```tsx
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
  ```

  Adicionar o terceiro botão logo depois do botão "Maquininha" (depois da linha 553, antes do `</div>` que fecha o grid):
  ```tsx
          {/* Cartão (link de pagamento) */}
          <button
            type="button"
            onClick={() => setPayment("card_link")}
            className={`option-card ${payment === "card_link" ? "selected" : ""}`}
            style={{ padding: "14px 6px" }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Link2 size={24} style={{ color: "#C89B3C" }} />
            </div>
            <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 13, color: "#1A1A1A", marginBottom: 4 }}>Cartão (link)</div>
            <div style={{ fontSize: 10.5, color: "#888", fontWeight: 500 }}>Enviado após confirmação</div>
            <div className="option-check">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
  ```

  Também reduzir os dois botões existentes (PIX e Maquininha, linhas 519 e 538) para ficarem visualmente consistentes com o terceiro, adicionando o mesmo `style={{ padding: "14px 6px" }}` a cada `<button className="option-card ...">` dessa seção e trocando `size={28}` por `size={24}` nos ícones `QrCode` e `CreditCard`. O texto interno (`PIX`, `Maquininha`, percentuais etc.) permanece igual — só o espaçamento/ícone encolhem para caber 3 colunas.

- [ ] **1.5 — `CheckoutForm.tsx`: aviso de envio manual do link**

  Adicionar o aviso logo depois do `</div>` que fecha o grid de pagamento (depois do novo botão do passo 1.4), ainda dentro da mesma `card-white` da seção 3 ("Forma de pagamento"), antes do `</div>` que fecha a seção:
  ```tsx
        {payment === "card_link" && (
          <div style={{
            marginTop: 16,
            background: "#FFF7E6",
            border: "1.5px solid #F5DFA6",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}>
            <Info size={15} style={{ color: "#B45309", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12.5, color: "#8A6D1D", fontWeight: 600, lineHeight: 1.4 }}>
              O link de pagamento será enviado manualmente pelo WhatsApp após a confirmação do pedido.
            </span>
          </div>
        )}
  ```

- [ ] **1.6 — Commit**
  ```
  feat(checkout): adiciona pagamento por link de cartão enviado manualmente

  Terceira opção de pagamento no checkout ("Cartão (link de pagamento)"),
  sem desconto (mesmo tratamento da Maquininha), com aviso de que o link
  é enviado manualmente pelo WhatsApp após a confirmação do pedido.
  ```

---

## Task 2: Propagar o novo método para API, mensagem de WhatsApp e telas admin

**Files:**
- `src/app/api/orders/route.ts`
- `src/lib/whatsapp.ts`
- `src/app/confirmacao/page.tsx`
- `src/components/admin/OrderModal.tsx`
- `src/components/admin/OrderDetailPanel.tsx`
- `src/components/admin/OrderCard.tsx`
- `src/components/admin/FiscalCopyButton.tsx`

**Interfaces:**
```ts
// api/orders/route.ts
interface OrderBody {
  // ...
  paymentMethod: "pix" | "card" | "card_link"
  // ...
}

// whatsapp.ts
interface OrderPayload {
  // ...
  paymentMethod: "pix" | "card" | "card_link"
  // ...
}

// confirmacao/page.tsx
type OrderSummary = {
  // ...
  paymentMethod: "pix" | "card" | "card_link"
  // ...
}
```

### Steps

- [ ] **2.1 — `src/app/api/orders/route.ts`: aceitar `card_link` na validação**

  Trocar o tipo do body (linha 15):
  ```ts
  paymentMethod: "pix" | "card"
  ```
  por:
  ```ts
  paymentMethod: "pix" | "card" | "card_link"
  ```

  Trocar a whitelist de validação (linha 35):
  ```ts
  const validPaymentMethods = ["pix", "card"]
  ```
  por:
  ```ts
  const validPaymentMethods = ["pix", "card", "card_link"]
  ```

  Nenhuma outra mudança é necessária nesse arquivo: o cálculo de `pixDiscountRate` (linha 112, `if (body.paymentMethod === "pix")`) já exclui `card_link` do desconto automaticamente, e `insertPayload.payment_method: body.paymentMethod` (linha 143) e `preferred_payment: body.paymentMethod` (linha 286, upsert de `customer_profiles`) já passam o valor adiante sem transformação.

- [ ] **2.2 — `src/lib/whatsapp.ts`: rótulo na mensagem de WhatsApp**

  Trocar o tipo do payload (linha 8):
  ```ts
  paymentMethod: "pix" | "card"
  ```
  por:
  ```ts
  paymentMethod: "pix" | "card" | "card_link"
  ```

  Trocar o cálculo de `paymentLabel` (linhas 60–62):
  ```ts
  const paymentLabel =
    order.paymentMethod === "pix"
      ? `PIX _(desconto de ${order.pixDiscountPercentLabel ?? "2%"} já incluído no total)_`
      : "Maquininha"
  ```
  por:
  ```ts
  const paymentLabel =
    order.paymentMethod === "pix"
      ? `PIX _(desconto de ${order.pixDiscountPercentLabel ?? "2%"} já incluído no total)_`
      : order.paymentMethod === "card_link"
        ? "Cartão (link de pagamento) — enviar link manualmente"
        : "Maquininha"
  ```

  Isso é consumido pela linha `` `💳 *Forma de pagamento:* ${paymentLabel}\n\n` `` já existente — nenhuma mudança adicional no corpo da mensagem.

- [ ] **2.3 — `src/app/confirmacao/page.tsx`: rótulo no resumo pós-checkout**

  Trocar o tipo `OrderSummary` (linha 11):
  ```ts
  paymentMethod: "pix" | "card"
  ```
  por:
  ```ts
  paymentMethod: "pix" | "card" | "card_link"
  ```

  Trocar a exibição do método de pagamento no resumo (linhas 178–180):
  ```tsx
                  {summary.paymentMethod === "pix"
                    ? `PIX (${summary.pixDiscountPercentLabel ?? "2%"} desconto)`
                    : "Maquininha"}
  ```
  por:
  ```tsx
                  {summary.paymentMethod === "pix"
                    ? `PIX (${summary.pixDiscountPercentLabel ?? "2%"} desconto)`
                    : summary.paymentMethod === "card_link"
                      ? "Cartão (link de pagamento)"
                      : "Maquininha"}
  ```

- [ ] **2.4 — `src/components/admin/OrderModal.tsx`: rótulo no modal de detalhe do pedido**

  Trocar a linha 71:
  ```tsx
              {order.payment_method === "pix" ? "PIX" : "Maquininha na entrega"}
  ```
  por:
  ```tsx
              {order.payment_method === "pix"
                ? "PIX"
                : order.payment_method === "card_link"
                  ? "Cartão (link de pagamento)"
                  : "Maquininha na entrega"}
  ```

- [ ] **2.5 — `src/components/admin/OrderDetailPanel.tsx`: rótulo no painel de detalhe**

  Trocar a linha 138:
  ```tsx
              { label: "Pagamento", value: displayOrder.payment_method === "pix" ? "PIX" : "Maquininha" },
  ```
  por:
  ```tsx
              { label: "Pagamento", value: displayOrder.payment_method === "pix" ? "PIX" : displayOrder.payment_method === "card_link" ? "Cartão (link)" : "Maquininha" },
  ```

- [ ] **2.6 — `src/components/admin/OrderCard.tsx`: badge no card do Kanban**

  Trocar a declaração de `isPix` (linha 50) para incluir `isCardLink`:
  ```ts
  const isPix       = order.payment_method === "pix"
  ```
  por:
  ```ts
  const isPix       = order.payment_method === "pix"
  const isCardLink  = order.payment_method === "card_link"
  ```

  Trocar o `<span>` da tag de pagamento (o segundo `<span>` do bloco "Tags", cujo estilo hoje é `isPix ? { background: "#F0FDF4", color: "#16A34A" } : { background: "#EFF6FF", color: "#2563EB" }` e conteúdo `{isPix ? "PIX" : "Cartão"}`):
  ```tsx
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={
            isPix
              ? { background: "#F0FDF4", color: "#16A34A" }
              : isCardLink
                ? { background: "#FEF3C7", color: "#B45309" }
                : { background: "#EFF6FF", color: "#2563EB" }
          }
        >
          {isPix ? "PIX" : isCardLink ? "Link" : "Cartão"}
        </span>
  ```

- [ ] **2.7 — `src/components/admin/FiscalCopyButton.tsx`: recibo impresso**

  Trocar a linha 28:
  ```ts
  const payment = order.payment_method === "pix" ? "PIX" : "Cartão / Maquininha"
  ```
  por:
  ```ts
  const payment = order.payment_method === "pix"
    ? "PIX"
    : order.payment_method === "card_link"
      ? "Cartão (link de pagamento)"
      : "Cartão / Maquininha"
  ```

- [ ] **2.8 — Commit**
  ```
  feat(checkout): propaga pagamento por link de cartão para API, WhatsApp e admin

  API valida "card_link", mensagem de WhatsApp avisa o atendente que
  precisa mandar o link manualmente, e as telas de pedido do admin
  (Kanban, modal, painel, recibo) mostram o rótulo correto.
  ```

---

## Task 3: Teste e2e

**Files:**
- `e2e/checkout-card-link-payment.spec.ts` (novo)

**Interfaces:**
```ts
test.describe("Cardápio — pagamento com link de cartão (sem desconto, aviso manual)", () => { ... })
```

### Steps

- [ ] **3.1 — Criar `e2e/checkout-card-link-payment.spec.ts`**, seguindo exatamente o padrão de `e2e/checkout-pix-discount.spec.ts` e `e2e/checkout-delivery-fee.spec.ts` (mesmos helpers `loadFixtures`, `resetProductStock`, `login`, mesmo `adminClient()` lido de `.env.local`, mesmo padrão de captura do popup usado em `storefront-cart-checkout.spec.ts`):

  ```ts
  import { test, expect } from "@playwright/test"
  import { createClient } from "@supabase/supabase-js"
  import fs from "fs"
  import { loadFixtures, resetProductStock } from "./fixtures"

  const fx = loadFixtures()

  function adminClient() {
    const env = Object.fromEntries(
      fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      })
    )
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  }

  test.beforeAll(async () => {
    await resetProductStock(fx.product.id)
  })

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/")
    await page.getByRole("button", { name: "Perfil" }).click()
    await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
    await page.getByPlaceholder("••••••••").fill(fx.customer.password)
    await page.locator("form").getByRole("button", { name: "Entrar" }).click()
    await page.waitForTimeout(500)
  }

  test.describe("Checkout — Cartão (link de pagamento)", () => {
    test("mostra o aviso de envio manual e não aplica nenhum desconto no resumo", async ({ page }) => {
      await login(page)
      await page.goto(`/produto/${fx.product.id}`)
      await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
      await page.getByRole("button", { name: "Carrinho" }).first().click()
      await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
      await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
      await expect(page).toHaveURL(/\/checkout/)

      // Antes de selecionar: nenhum aviso de link manual visível.
      await expect(page.getByText(/link de pagamento será enviado manualmente/i)).not.toBeVisible()

      await page.getByRole("button", { name: /^Cartão \(link\)/ }).click()

      await expect(page.getByText(/o link de pagamento será enviado manualmente pelo whatsapp após a confirmação do pedido/i)).toBeVisible()
      // Sem badge nem linha de desconto — mesmo tratamento da Maquininha.
      await expect(page.getByText(/desconto de \d/i)).not.toBeVisible()
      await expect(page.getByText(/desconto pix/i)).not.toBeVisible()
    })

    test("fluxo completo cria o pedido sem desconto e a mensagem de WhatsApp traz o rótulo correto", async ({ page, context }) => {
      await login(page)
      await page.goto(`/produto/${fx.product.id}`)
      await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
      await page.getByRole("button", { name: "Carrinho" }).first().click()
      await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
      await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
      await expect(page).toHaveURL(/\/checkout/)

      await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Link Cartão E2E")
      await page.getByPlaceholder("(41) 99999-9999").fill("41999993333")
      await page.getByRole("button", { name: /^Retirada/ }).click()
      await page.getByRole("button", { name: /^Cartão \(link\)/ }).click()

      const submit = page.getByRole("button", { name: /confirmar e abrir whatsapp/i })
      await expect(submit).toBeEnabled()

      const [popup] = await Promise.all([
        context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
        submit.click(),
      ])
      if (popup) await popup.close()

      await expect(page).toHaveURL(/\/confirmacao/, { timeout: 15_000 })
      await expect(page.getByText(/pedido confirmado/i)).toBeVisible()

      // Resumo na página de confirmação mostra o rótulo certo, sem desconto.
      await expect(page.getByText("Cartão (link de pagamento)")).toBeVisible()

      // Mensagem de WhatsApp real (parâmetro "wa" carregado do redirect) traz o
      // aviso pro atendente e nenhuma linha de desconto/pendência de PIX.
      const url = new URL(page.url())
      const waParam = url.searchParams.get("wa")
      expect(waParam).toBeTruthy()
      const waUrl = new URL(decodeURIComponent(waParam!))
      const message = waUrl.searchParams.get("text")
      expect(message).toBeTruthy()
      expect(message).toContain("Cartão (link de pagamento) — enviar link manualmente")
      expect(message).not.toContain("desconto")
      expect(message).not.toContain("Pagamento pendente")

      // Confirma no banco: sem desconto (subtotal === total, sem taxa de entrega no pickup).
      const { data: order } = await adminClient()
        .from("orders")
        .select("payment_method, subtotal, total")
        .eq("customer_phone", "41999993333")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      expect(order?.payment_method).toBe("card_link")
      expect(Number(order?.total)).toBe(Number(order?.subtotal))
    })
  })

  test.describe("API /api/orders — card_link nunca aplica desconto", () => {
    test("servidor grava payment_method=card_link e total sem desconto, mesmo se o cliente tentar forjar", async ({ request }) => {
      const res = await request.post("/api/orders", {
        data: {
          customerName: "Teste Card Link API E2E",
          customerPhone: "41999992222",
          deliveryType: "pickup",
          paymentMethod: "card_link",
          items: [{
            product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
            quantity: 1,
          }],
          total: 0.01, // valor forjado, bem abaixo do real — servidor deve ignorar
        },
      })
      expect(res.ok(), await res.text()).toBeTruthy()
      const body = await res.json()

      const { data: order } = await adminClient().from("orders").select("payment_method, subtotal, total").eq("id", body.orderId).single()
      expect(order?.payment_method).toBe("card_link")
      expect(Number(order?.subtotal)).toBe(fx.product.price)
      expect(Number(order?.total)).toBe(fx.product.price) // sem desconto nenhum
    })
  })
  ```

  Notas de implementação:
  - `getByRole("button", { name: /^Cartão \(link\)/ })` funciona porque o nome acessível do botão é a concatenação dos textos internos ("Cartão (link)" + "Enviado após confirmação"), igual ao padrão já usado para `/^PIX/` e `/^Retirada/` nos specs existentes.
  - A extração da mensagem de WhatsApp usa o mesmo parâmetro `wa` que `CheckoutForm.doSubmit()` já anexa ao `router.push` (`/confirmacao?order=...&wa=${encodedWa}`, onde `encodedWa = encodeURIComponent(waUrl)` e `waUrl` contém `?text=${encodeURIComponent(message)}`); `new URL(...).searchParams.get("text")` já decodifica automaticamente o texto puro da mensagem.
  - O teste de API roda sozinho (sem depender do `beforeAll` de stock reset da suíte de UI) e confirma o mesmo contrato validado no passo 2.1 (`validPaymentMethods` aceitando `card_link` e nenhum desconto sendo calculado).

- [ ] **3.2 — Rodar o novo spec e confirmar que passa**
  ```bash
  npx playwright test e2e/checkout-card-link-payment.spec.ts --project=chromium
  ```
  Confirmar que os 4 testes passam (2 de UI, 2 de API) antes de seguir para o commit. Se a migration do Task 1.1 não tiver sido aplicada no projeto Supabase usado pelos testes, o teste de API vai falhar com erro 500 ("Erro ao criar pedido") por violação do `CHECK` — nesse caso, voltar e aplicar a migration antes de re-rodar.

- [ ] **3.3 — Rodar a suíte de checkout já existente para garantir que nada quebrou**
  ```bash
  npx playwright test e2e/checkout-pix-discount.spec.ts e2e/checkout-delivery-fee.spec.ts e2e/checkout-rice-choice.spec.ts --project=chromium
  ```
  Essas suítes selecionam `PIX` e `card` (Maquininha) por regex de nome de botão (`/^PIX/`, `card` só é usado direto na API) — a mudança de grid de 2 para 3 colunas e o novo botão não deve quebrar esses seletores, mas confirmar antes de fechar a task.

- [ ] **3.4 — Commit**
  ```
  test(checkout): cobre pagamento com link de cartão (aviso, sem desconto, rótulo no WhatsApp)
  ```

---

### Critical Files for Implementation
- src/components/checkout/CheckoutForm.tsx
- src/app/api/orders/route.ts
- src/lib/whatsapp.ts
- src/lib/supabase/database.types.ts
- supabase/migrations/20260716_024_card_link_payment.sql
