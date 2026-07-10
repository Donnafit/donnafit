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

test.describe("Cardápio — desconto PIX configurável (2%, não mais 5% fixo)", () => {
  test("checkout mostra o percentual configurado, não um valor fixo hardcoded", async ({ page }) => {
    const { data: settings } = await adminClient().from("store_settings").select("pix_discount_rate").eq("id", "default").single()
    const expectedPercent = Number(settings?.pix_discount_rate ?? 0.02) * 100
    const expectedLabel = `${expectedPercent % 1 === 0 ? expectedPercent.toFixed(0) : expectedPercent.toFixed(1)}%`

    await login(page)
    await page.goto(`/produto/${fx.product.id}`)
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    await page.getByRole("button", { name: "Carrinho" }).first().click()
    await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
    await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
    await expect(page).toHaveURL(/\/checkout/)

    await expect(page.getByText(`${expectedLabel} de desconto`)).toBeVisible()
    await page.getByRole("button", { name: /^PIX/ }).click()
    await expect(page.getByText(`Desconto de ${expectedLabel} aplicado!`)).toBeVisible()
    await expect(page.getByText(`Desconto PIX (${expectedLabel})`)).toBeVisible()
  })
})

test.describe("API /api/orders — desconto PIX nunca confia no valor do cliente", () => {
  test("servidor recalcula o desconto a partir de store_settings, ignorando total forjado", async ({ request }) => {
    const { data: settings } = await adminClient().from("store_settings").select("pix_discount_rate").eq("id", "default").single()
    const rate = Number(settings?.pix_discount_rate ?? 0.02)

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste PIX API E2E",
        customerPhone: "41999994444",
        deliveryType: "pickup",
        paymentMethod: "pix",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 1,
        }],
        total: 0.01, // valor forjado, bem abaixo do real
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()

    const { data: order } = await adminClient().from("orders").select("subtotal, total").eq("id", body.orderId).single()
    const expectedTotal = fx.product.price - fx.product.price * rate
    expect(Number(order?.subtotal)).toBe(fx.product.price)
    expect(Number(order?.total)).toBeCloseTo(expectedTotal, 2)
  })
})
