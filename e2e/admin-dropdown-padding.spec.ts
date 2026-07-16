import { test, expect, type Page } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

async function loginAdmin(page: Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
}

// Distância entre a borda direita do ícone e a borda direita do elemento pai —
// mede o "respiro" real em pixels, sem depender de comparação de screenshot
// (frágil). 14px é o mínimo aceitável de espaçamento visual.
async function rightGap(container: ReturnType<Page["locator"]>, icon: ReturnType<Page["locator"]>) {
  const [containerBox, iconBox] = await Promise.all([container.boundingBox(), icon.boundingBox()])
  if (!containerBox || !iconBox) throw new Error("Elemento não encontrado ou não visível")
  return (containerBox.x + containerBox.width) - (iconBox.x + iconBox.width)
}

test.describe("Admin — espaçamento da seta nos dropdowns", () => {
  test("filtro de categoria no Estoque tem respiro adequado entre seta e borda", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/estoque")
    const dropdown = page.getByTestId("stock-category-filter")
    const chevron = page.getByTestId("stock-category-filter-chevron")
    await expect(dropdown).toBeVisible()
    expect(await rightGap(dropdown, chevron)).toBeGreaterThanOrEqual(14)
  })

  test("accordion de categoria no Manual tem respiro adequado entre seta e borda", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/manual")
    const toggle = page.getByTestId("manual-category-toggle").first()
    const chevron = page.getByTestId("manual-accordion-chevron").first()
    await expect(toggle).toBeVisible()
    expect(await rightGap(toggle, chevron)).toBeGreaterThanOrEqual(18)
  })

  // Screenshots pra revisão visual manual — não há seta customizada pra medir
  // em Anúncios (setas são de reordenar, na esquerda) nem em Configurações
  // (select nativo, sem ícone no DOM), então aqui só garantimos que a tela
  // carrega e captura uma imagem de referência.
  test("screenshots de referência — Anúncios e Configurações", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/anuncios")
    await expect(page.getByRole("heading", { name: /avisos do site/i })).toBeVisible()
    await page.screenshot({ path: "e2e/.results/admin-anuncios-dropdown.png" })

    await page.goto("/admin/configuracoes")
    await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible()
    await page.screenshot({ path: "e2e/.results/admin-configuracoes-dropdown.png" })
  })
})
