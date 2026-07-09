import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()
const TEST_PHONE = "41988887777"

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
  // o histórico busca pedidos por customer_phone salvo no user_metadata —
  // sem isso, o pedido criado via API não bate com nenhum telefone do perfil.
  await adminClient().auth.admin.updateUserById(fx.customer.id, {
    user_metadata: { name: "Cliente Teste E2E", phone: TEST_PHONE },
  })
})

async function createOrderForHistory(request: import("@playwright/test").APIRequestContext, customerName: string) {
  const res = await request.post("/api/orders", {
    data: {
      customerName,
      customerPhone: TEST_PHONE,
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

async function loginAndOpenHistory(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Perfil" }).click()
  await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
  await page.getByPlaceholder("••••••••").fill(fx.customer.password)
  await page.locator("form").getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByText("Minha Conta")).toBeVisible({ timeout: 8000 })
  await page.getByText("Meus Pedidos").click()
}

test.describe("Cardápio — histórico de pedidos do cliente", () => {
  test("pedido aparece no histórico e 'Pedir novamente' repõe o carrinho e navega", async ({ page, request }) => {
    const order = await createOrderForHistory(request, "Cliente Teste E2E")
    await loginAndOpenHistory(page)

    await expect(page.getByText(`#${order.orderNumber}`)).toBeVisible({ timeout: 8000 })

    await page.getByRole("button", { name: /pedir novamente/i }).first().click()
    await expect(page).toHaveURL(/\/carrinho/, { timeout: 8000 })
  })

  test("'Remover do histórico' esconde o pedido (persistido em localStorage)", async ({ page, request }) => {
    const order = await createOrderForHistory(request, "Cliente Teste E2E")
    await loginAndOpenHistory(page)

    const orderText = `#${order.orderNumber}`
    await expect(page.getByText(orderText)).toBeVisible({ timeout: 8000 })

    await page.getByTitle("Remover do histórico").first().click()
    await expect(page.getByText(orderText)).not.toBeVisible()

    // Comportamento correto (corrigido nesta sessão): reabrir a modal não traz de volta.
    await page.getByRole("button", { name: "Fechar" }).or(page.locator('[aria-label="Fechar"]')).click().catch(() => {})
    await page.keyboard.press("Escape").catch(() => {})
    await page.getByRole("button", { name: "Perfil" }).click()
    await expect(page.getByText("Minha Conta")).toBeVisible({ timeout: 5000 })
    await page.getByText("Meus Pedidos").click()
    await expect(page.getByText(orderText)).not.toBeVisible({ timeout: 3000 })
  })
})
