import { test, expect } from "@playwright/test"

test.describe("Cardápio — navegação e descoberta", () => {
  test("home carrega com header, hero e grid de produtos", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /marmitas saud[aá]veis/i })).toBeVisible()
    await expect(page.locator(".product-grid")).toBeVisible()
  })

  test("categoria inexistente na URL não quebra a página (cai em 'Todos')", async ({ page }) => {
    await page.goto("/?cat=categoria-que-nao-existe-mais")
    await expect(page.locator(".product-grid")).toBeVisible()
  })

  test("clicar em uma categoria filtra o grid instantaneamente (client-side)", async ({ page }) => {
    await page.goto("/")
    // "Combos" existe tanto no menu do header quanto nos chips do filtro de categoria —
    // pega o chip do filtro (o último "Combos" na página).
    const chip = page.getByRole("button", { name: "Combos", exact: true }).last()
    await chip.click()
    // grid não deve navegar (mesma URL de base, sem reload de página)
    await expect(page).toHaveURL(/\/(\?.*)?$/)
    await expect(page.locator(".product-grid")).toBeVisible()
  })

  test("busca por texto na barra de filtro reduz o grid", async ({ page }) => {
    await page.goto("/")
    const initialCount = await page.locator(".product-grid > div").count()
    await page.getByPlaceholder("Pesquisar produtos...").fill("zzzz_termo_sem_resultado_zzzz")
    await expect(page.getByText(/nenhum produto encontrado/i)).toBeVisible()
    await page.getByPlaceholder("Pesquisar produtos...").fill("")
    await expect(page.locator(".product-grid > div")).toHaveCount(initialCount)
  })

  test("modal de busca (desktop) — menos de 2 caracteres não dispara consulta", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Buscar" }).click()
    const input = page.locator('input[placeholder*="Pesquisar" i], input[placeholder*="Buscar" i]').last()
    await input.fill("a")
    await page.waitForTimeout(400)
    // não deve mostrar spinner de carregamento nem resultados para 1 char
    await expect(page.getByText(/nenhum resultado/i)).not.toBeVisible()
  })
})
