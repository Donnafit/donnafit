import { test, expect } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()
const instructionText = `Aquecer no microondas por 3 minutos. Teste E2E ${fx.runTag}.`

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/manual")
}

test.describe("Admin — Manual de Preparo", () => {
  test("produto novo (sem instrução ainda) aparece na lista e pode receber a primeira instrução", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("E2E_TEST")
    await page.getByText(fx.product.name, { exact: false }).first().click()

    await expect(page.getByText(/nenhuma instrução de preparo cadastrada/i)).toBeVisible()

    await page.getByRole("button", { name: "Editar" }).click()
    await page.getByPlaceholder(/descreva o passo a passo/i).fill(instructionText)
    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Salvar")).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(instructionText)).toBeVisible()
  })

  test("instrução salva persiste após recarregar a página", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("E2E_TEST")
    await page.getByText(fx.product.name, { exact: false }).first().click()
    await expect(page.getByText(instructionText)).toBeVisible({ timeout: 5000 })

    await page.reload()
    await page.getByPlaceholder("Buscar produto...").fill("E2E_TEST")
    await page.getByText(fx.product.name, { exact: false }).first().click()
    await expect(page.getByText(instructionText)).toBeVisible({ timeout: 5000 })
  })
})
