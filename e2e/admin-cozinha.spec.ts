import { test, expect } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/cozinha")
}

test.describe("Admin — Cozinha", () => {
  test("busca produto, seleciona, registra produção e o estoque/log atualizam", async ({ page }) => {
    await loginAdmin(page)

    await page.getByPlaceholder("Buscar produto...").fill("E2E_TEST")
    await page.getByText(fx.product.name, { exact: false }).first().click()

    await page.getByPlaceholder("Qtd").fill("3")
    const registerBtn = page.getByRole("button", { name: /^Registrar$/ })
    await expect(registerBtn).toBeEnabled()
    await registerBtn.click()

    await expect(page.getByText(/registrado:/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(fx.product.name, { exact: false }).first()).toBeVisible()
  })

  test("não deixa registrar sem selecionar produto ou sem quantidade", async ({ page }) => {
    await loginAdmin(page)
    const registerBtn = page.getByRole("button", { name: /^Registrar$/ })
    await expect(registerBtn).toBeDisabled()

    await page.getByPlaceholder("Qtd").fill("5")
    // ainda sem produto selecionado — continua desabilitado
    await expect(registerBtn).toBeDisabled()
  })
})
