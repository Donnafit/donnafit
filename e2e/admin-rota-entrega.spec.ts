import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures } from "./fixtures"

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

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/rota-entrega")
}

// Cria o pedido via API (fluxo real) e avança pra "ready" direto no banco —
// chegar em "ready" pela UI já é coberto pelo teste de admin-pedidos.spec.ts.
async function createReadyDeliveryOrder(request: import("@playwright/test").APIRequestContext, customerName: string) {
  const res = await request.post("/api/orders", {
    data: {
      customerName,
      customerPhone: `4199998${Math.floor(Math.random() * 9000 + 1000)}`,
      deliveryType: "delivery",
      deliveryAddress: "Rua de Teste E2E, 123, Bairro Teste",
      deliveryFee: 15,
      paymentMethod: "card",
      items: [{
        product: {
          id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`,
          price: fx.product.price, stock_type: "avulso", category_id: null,
        },
        quantity: 1,
      }],
      total: fx.product.price + 15,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const order = await res.json()
  await adminClient().from("orders").update({ status: "ready" }).eq("id", order.orderId)
  return order
}

test.describe("Admin — Rota de Entrega", () => {
  test("pedido de entrega 'ready' aparece em Para Entregar e avança até Entregue", async ({ page, request }) => {
    const customerName = `Rota E2E ${fx.runTag}-${Math.random().toString(36).slice(2, 6)}`
    await createReadyDeliveryOrder(request, customerName)
    await loginAdmin(page)

    const card = page.getByTestId("delivery-card").filter({ hasText: customerName })
    await expect(card).toBeVisible({ timeout: 5000 })
    await expect(card.getByRole("link", { name: /navegar/i })).toHaveAttribute("href", /google\.com\/maps/)

    await card.getByRole("button", { name: "Saiu para Entrega" }).click()
    await expect(card.getByRole("button", { name: "Confirmar Entrega" })).toBeVisible({ timeout: 5000 })

    await card.getByRole("button", { name: "Confirmar Entrega" }).click()
    // Comportamento correto: sai de "Para entregar" e vai pra "Entregues", sem botão de ação.
    await expect(card.getByRole("button")).not.toBeVisible({ timeout: 5000 })
  })

  test("pedido de retirada (pickup) nunca aparece na Rota de Entrega", async ({ page, request }) => {
    const customerName = `Rota Pickup E2E ${fx.runTag}-${Math.random().toString(36).slice(2, 6)}`
    const res = await request.post("/api/orders", {
      data: {
        customerName,
        customerPhone: `4199997${Math.floor(Math.random() * 9000 + 1000)}`,
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 1,
        }],
        total: fx.product.price,
      },
    })
    const order = await res.json()
    await adminClient().from("orders").update({ status: "ready" }).eq("id", order.orderId)

    await loginAdmin(page)
    await expect(page.getByText(customerName)).not.toBeVisible({ timeout: 3000 })
  })
})
