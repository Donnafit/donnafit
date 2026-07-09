import { test, expect } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()
const textA = `[E2E_TEST] Aviso A ${fx.runTag}`
const textB = `[E2E_TEST] Aviso B ${fx.runTag}`

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/anuncios")
}

// Remove qualquer resíduo de execuções anteriores que tenham falhado no meio
// do teste (antes de rodar a limpeza própria) — garante estado limpo.
async function clearStrayTestAnnouncements(page: import("@playwright/test").Page) {
  page.on("dialog", (d) => d.accept())
  for (let i = 0; i < 10; i++) {
    const stray = page.getByTestId("announcement-row").filter({ hasText: "[E2E_TEST]" }).first()
    if ((await stray.count()) === 0) break
    await stray.getByTitle("Remover").click()
    await page.waitForTimeout(300)
  }
  page.removeAllListeners("dialog")
}

async function addAnnouncement(page: import("@playwright/test").Page, text: string) {
  const input = page.getByPlaceholder(/frete gr[aá]tis/i)
  await input.fill(text)
  await input.press("Enter")
  await expect(page.getByText(text)).toBeVisible({ timeout: 5000 })
}

test.describe("Admin — Anúncios", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page)
    await clearStrayTestAnnouncements(page)
  })

  test("cria, ativa/desativa e exclui um anúncio (com confirmação)", async ({ page }) => {
    await addAnnouncement(page, textA)

    const row = page.getByTestId("announcement-row").filter({ hasText: textA })
    await row.getByTitle("Desativar").click()
    await expect(row.getByTitle("Ativar")).toBeVisible()

    page.once("dialog", (d) => d.dismiss())
    await row.getByTitle("Remover").click()
    // Comportamento correto: cancelar a confirmação mantém o item na lista.
    await expect(page.getByText(textA)).toBeVisible()

    page.once("dialog", (d) => d.accept())
    await row.getByTitle("Remover").click()
    await expect(page.getByText(textA)).not.toBeVisible({ timeout: 5000 })
  })

  test("reordenar com as setas move o anúncio de posição de verdade", async ({ page }) => {
    await addAnnouncement(page, textA)
    await addAnnouncement(page, textB)

    const orderBefore = await page.getByTestId("announcement-row").filter({ hasText: /\[E2E_TEST\] Aviso/ }).allTextContents()
    const indexA = orderBefore.findIndex((t) => t.includes(textA))
    const indexB = orderBefore.findIndex((t) => t.includes(textB))
    expect(indexA).toBeLessThan(indexB)

    const rowB = page.getByTestId("announcement-row").filter({ hasText: textB })
    await rowB.getByTitle("Mover para cima").click()
    await page.waitForTimeout(500)

    const orderAfter = await page.getByTestId("announcement-row").filter({ hasText: /\[E2E_TEST\] Aviso/ }).allTextContents()
    const indexAAfter = orderAfter.findIndex((t) => t.includes(textA))
    const indexBAfter = orderAfter.findIndex((t) => t.includes(textB))
    // Comportamento correto: B deve ter subido, ficando antes de A agora.
    expect(indexBAfter).toBeLessThan(indexAAfter)

    await clearStrayTestAnnouncements(page)
  })
})
