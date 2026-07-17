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
  // Locator escopado a <main>: o CartDrawer (montado globalmente pelo Header,
  // fora de <main>, off-screen quando fechado) renderiza um botão com o MESMO
  // aria-label "Adicionar mais um" assim que o item entra no carrinho —
  // sem escopo, o locator fica ambíguo (2 matches) e o clique trava até
  // o timeout tentando interagir com o botão fora da viewport do drawer.
  for (let i = 1; i < quantity; i++) {
    await page.locator("main").getByRole("button", { name: "Adicionar mais um" }).click()
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
    await expect(page.getByPlaceholder(/rua, número, bairro/i)).toBeVisible()
  })

  test("aviso de frete mínimo também aparece no resumo do carrinho no cardápio", async ({ page }) => {
    await login(page)
    await addQuantity(page, 5)
    await page.getByRole("button", { name: "Carrinho" }).first().click()
    await expect(page.getByTestId("cart-drawer").getByText(/frete a partir de 8 marmitas/i)).toBeVisible({ timeout: 5000 })
  })
})
