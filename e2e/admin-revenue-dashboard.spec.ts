import { test, expect } from "@playwright/test"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()

// Sufixo novo a cada execução — evita colisão com pedidos de execuções
// anteriores da mesma suite (mesmo padrão de admin-pedidos.spec.ts).
const testRunId = `${fx.runTag}-${Math.random().toString(36).slice(2, 8)}`

test.beforeAll(async () => {
  await resetProductStock(fx.product.id)
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
        quantity: 2,
      }],
      total: fx.product.price * 2,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  return res.json()
}

test.describe("Admin — Dashboard de Faturamento", () => {
  test("abre popup ao clicar no tile Faturamento, mostra totais e atualiza ao trocar filtro", async ({ page, request }) => {
    const customerName = `Pedido Faturamento E2E ${testRunId}`
    await createTestOrder(request, customerName)

    await loginAdmin(page)

    // Abre o popup pelo tile
    await page.getByRole("button", { name: "Ver dashboard de faturamento" }).click()
    await expect(page.getByRole("heading", { name: "Faturamento" })).toBeVisible()

    // Filtro "Hoje" ativo por padrão
    await expect(page.getByRole("button", { name: "Hoje", exact: true })).toHaveAttribute("aria-pressed", "true")

    // Espera o primeiro fetch resolver e o gráfico renderizar
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible({ timeout: 5000 })

    const totalOrdersHoje = Number(
      await page.locator('[data-testid="stat-total-orders"]').innerText()
    )
    // O pedido de teste foi criado agora — deve contar no filtro "Hoje".
    expect(totalOrdersHoje).toBeGreaterThanOrEqual(1)

    // Troca pra "7 dias" — dispara um novo fetch com from/to diferentes.
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/dashboard/revenue") && res.url().includes("from=")
    )
    await page.getByRole("button", { name: "7 dias", exact: true }).click()
    const response = await responsePromise
    expect(response.ok()).toBeTruthy()

    await expect(page.getByRole("button", { name: "7 dias", exact: true })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("button", { name: "Hoje", exact: true })).toHaveAttribute("aria-pressed", "false")

    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible({ timeout: 5000 })

    const totalOrders7d = Number(
      await page.locator('[data-testid="stat-total-orders"]').innerText()
    )
    // "7 dias" é um superconjunto de "Hoje" — o total nunca pode ser menor.
    expect(totalOrders7d).toBeGreaterThanOrEqual(totalOrdersHoje)
  })

  test("API retorna previousPeriod com totais do período anterior", async ({ page }) => {
    await loginAdmin(page)

    const todayKey = new Date().toISOString().slice(0, 10)
    const res = await page.request.get(`/api/dashboard/revenue?from=${todayKey}&to=${todayKey}`)
    expect(res.ok()).toBeTruthy()

    const json = await res.json()
    expect(typeof json.previousPeriod?.totalOrders).toBe("number")
    expect(typeof json.previousPeriod?.totalItems).toBe("number")
    expect(typeof json.previousPeriod?.totalRevenue).toBe("number")
  })
})
