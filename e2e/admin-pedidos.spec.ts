import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()

// Sufixo novo a cada execução — sem isso, reexecutar a suite várias vezes no
// mesmo dia (mesmo fx.runTag) acumula pedidos de teste duplicados com o
// MESMO nome de cliente, e ".first()" passa a apontar pra um pedido
// aleatório entre os duplicados em vez do que este teste acabou de criar.
const testRunId = `${fx.runTag}-${Math.random().toString(36).slice(2, 8)}`

test.beforeAll(async () => {
  await resetProductStock(fx.product.id)

  // limpa pedidos de teste de execuções anteriores da suite (mesmo produto de teste)
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
  )
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: items } = await sb.from("order_items").select("order_id").eq("product_id", fx.product.id)
  const orderIds = [...new Set((items ?? []).map((i: any) => i.order_id))]
  if (orderIds.length) {
    await sb.from("order_items").delete().in("order_id", orderIds)
    await sb.from("orders").delete().in("id", orderIds)
  }
})

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
}

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
  return res.json()
}

// Reabre o painel de detalhe do pedido (ele fecha sozinho após cada avanço de status).
// A aba "Todos" garante que o pedido apareça independente do status atual —
// as outras abas filtram por status e o pedido muda de aba a cada avanço.
async function openOrderDetail(page: import("@playwright/test").Page, customerName: string) {
  await page.getByRole("button", { name: "Todos" }).click()
  await page.getByPlaceholder("Buscar pedido...").fill(customerName)
  const row = page.getByText(customerName).first()
  await expect(row).toBeVisible({ timeout: 5000 })
  // a lista refaz o fetch via realtime a cada mudança de status; espera
  // estabilizar antes de clicar pra não clicar num nó que está sendo trocado.
  await page.waitForTimeout(400)
  await row.click()
}

test.describe("Admin — Pedidos", () => {
  test("pedido criado via checkout aparece na lista, abre o detalhe e avança de status até 'Entregue'", async ({ page, request }) => {
    const customerName = `Pedido Painel E2E ${testRunId}-A`
    await createTestOrder(request, customerName)
    await loginAdmin(page)
    await openOrderDetail(page, customerName)

    // pending -> production
    await page.getByRole("button", { name: "Iniciar Separação" }).click()
    await expect(page.getByRole("button", { name: "Iniciar Separação" })).not.toBeVisible()
    await openOrderDetail(page, customerName)
    await expect(page.getByRole("button", { name: "Liberar Pedido" })).toBeVisible({ timeout: 5000 })

    // production -> ready
    await page.getByRole("button", { name: "Liberar Pedido" }).click()
    await expect(page.getByRole("button", { name: "Liberar Pedido" })).not.toBeVisible()
    await openOrderDetail(page, customerName)
    await expect(page.getByRole("button", { name: "Confirmar Retirada" })).toBeVisible({ timeout: 5000 })

    // ready -> delivered (pickup)
    await page.getByRole("button", { name: "Confirmar Retirada" }).click()
    await expect(page.getByRole("button", { name: "Confirmar Retirada" })).not.toBeVisible()
    await page.getByPlaceholder("Buscar pedido...").fill(customerName)
    await expect(page.getByText(/entregue|retirado/i).first()).toBeVisible({ timeout: 5000 })
  })

  test("clique duplo rápido no botão de avançar status não duplica a transição", async ({ page, request }) => {
    const customerName = `Pedido Painel E2E ${testRunId}-B`
    await createTestOrder(request, customerName)
    await loginAdmin(page)
    await openOrderDetail(page, customerName)

    const advanceBtn = page.getByRole("button", { name: "Iniciar Separação" })
    await advanceBtn.click()
    // segundo clique imediato: painel já deve estar fechando ou o botão desabilitado —
    // não deve lançar uma segunda chamada de transição.
    await advanceBtn.click({ timeout: 1000 }).catch(() => {})

    await openOrderDetail(page, customerName)
    // Comportamento correto: avançou uma única vez, mostrando "Liberar Pedido" agora.
    await expect(page.getByRole("button", { name: "Liberar Pedido" })).toBeVisible({ timeout: 5000 })
  })
})
