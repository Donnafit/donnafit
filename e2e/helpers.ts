import { expect, type Page } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

export async function login(page: Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Perfil" }).click()
  await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
  await page.getByPlaceholder("••••••••").fill(fx.customer.password)
  await page.locator("form").getByRole("button", { name: "Entrar" }).click()
  await page.waitForTimeout(500)
}

export async function addToCartAndGoToCheckout(page: Page) {
  await login(page)
  await page.goto(`/produto/${fx.product.id}`)
  await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
  // Frete mínimo de 8 marmitas (B14) — sem isso, o botão "Entrega" abaixo
  // fica desabilitado e os testes que usam este helper quebram.
  // Locator escopado a <main>: o CartDrawer (montado globalmente pelo Header,
  // fora de <main>, off-screen quando fechado) renderiza um botão com o MESMO
  // aria-label "Adicionar mais um" assim que o item entra no carrinho —
  // sem escopo, o locator fica ambíguo (2 matches) e o clique trava até
  // o timeout tentando interagir com o botão fora da viewport do drawer.
  for (let i = 1; i < 8; i++) {
    await page.locator("main").getByRole("button", { name: "Adicionar mais um" }).click()
  }
  await page.getByRole("button", { name: "Carrinho" }).first().click()
  await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
  await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
  await expect(page).toHaveURL(/\/checkout/, { timeout: 10_000 })
  await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Frete E2E")
  await page.getByPlaceholder("(41) 99999-9999").fill("41999997777")
  await page.getByRole("button", { name: /^Entrega/ }).click()
}
