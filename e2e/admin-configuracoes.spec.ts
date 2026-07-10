import { test, expect } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/configuracoes")
}

test.describe("Admin — Configurações", () => {
  test("salvar alterações persiste de verdade após recarregar a página", async ({ page }) => {
    await loginAdmin(page)

    const storeNameInput = page.getByLabel("Nome do restaurante").or(page.locator('input').first())
    const uniqueName = `Donna FIT Teste ${fx.runTag}`
    await storeNameInput.fill(uniqueName)
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()

    await page.reload()
    // Comportamento correto: valor sobrevive ao reload (antes, tudo voltava ao padrão "Donna FIT").
    await expect(page.locator('input').first()).toHaveValue(uniqueName)
  })

  test("toggle de som responde ao clique (antes não tinha handler nenhum)", async ({ page }) => {
    await loginAdmin(page)
    const toggle = page.getByRole("switch", { name: /som ao receber pedido/i })
    const before = await toggle.getAttribute("aria-checked")
    await toggle.click()
    const after = await toggle.getAttribute("aria-checked")
    expect(after).not.toBe(before)
  })

  test("desconto PIX é editável e persiste após recarregar", async ({ page }) => {
    await loginAdmin(page)
    const pixInput = page.locator('input[type="number"]').first()
    await expect(pixInput).toBeVisible()

    await pixInput.fill("3")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()

    await page.reload()
    await expect(page.locator('input[type="number"]').first()).toHaveValue("3")

    // restaura pra não deixar a taxa real do restaurante alterada pelo teste
    await page.locator('input[type="number"]').first().fill("2")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()
  })

  test("gestão de taxas por bairro mora em Configurações (não mais em Rota de Entrega)", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /gerenciar taxas por bairro/i }).click()
    await expect(page.getByText("Taxas de entrega por bairro")).toBeVisible()
    await expect(page.getByText(/bairros cadastrados/i)).toBeVisible()

    const modal = page.getByTestId("delivery-zones-modal")
    await modal.getByPlaceholder(/buscar bairro/i).fill("Batel")
    const feeInput = modal.locator('input[type="number"]').first()
    await expect(feeInput).toHaveValue("12")

    await page.getByRole("button", { name: "Fechar" }).click()
    await expect(page.getByText("Taxas de entrega por bairro")).not.toBeVisible()

    // Negativo: não deve mais existir em Rota de Entrega.
    await page.goto("/admin/rota-entrega")
    await expect(page.getByRole("button", { name: /taxas por bairro/i })).not.toBeVisible()
  })
})
