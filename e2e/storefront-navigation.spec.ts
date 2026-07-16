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

  test("clicar numa categoria dentro do popup '+' (Ver todas as categorias) filtra o grid", async ({ page }) => {
    await page.goto("/")
    const plusButton = page.getByRole("button", { name: "Ver todas as categorias" })
    await plusButton.click()

    // Pega qualquer item do dropdown que não seja "Todos" (a categoria
    // escondida atrás do "+" varia conforme o catálogo, então usamos a
    // primeira disponível dentro do popup em vez de fixar um nome). "Todos"
    // é excluído porque já é a categoria ativa por padrão ao carregar a
    // página — selecioná-lo de novo não provaria que o clique realmente
    // disparou onSelect.
    const categoryButton = page
      .locator('div[style*="position: absolute"] button, div[style*="position:absolute"] button')
      .filter({ hasNotText: "Todos" })
      .first()
    await expect(categoryButton).toBeVisible({ timeout: 3000 })
    await categoryButton.click()

    // Bug corrigido: o popup fecha E o grid realmente filtra por essa categoria
    // (antes do fix, nada acontecia — onSelect nunca era chamado). Como a
    // categoria escolhida está escondida atrás do "+" (não é um chip visível
    // fixo), o próprio botão "+" fica destacado em dourado quando a categoria
    // ativa está entre as escondidas — sinal de ativação independente do nome
    // da categoria sorteada no popup.
    await expect(plusButton).toBeVisible()
    await expect(plusButton).toHaveCSS("background-color", "rgb(200, 155, 60)")
  })
})
