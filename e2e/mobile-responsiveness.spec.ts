import { test, expect, type Page } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()
const MOBILE_VIEWPORT = { width: 390, height: 844 } // iPhone 12

async function loginAdmin(page: Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }))
  expect(
    overflow.scrollWidth,
    `${label}: body.scrollWidth (${overflow.scrollWidth}) > clientWidth (${overflow.clientWidth}) — overflow horizontal detectado`
  ).toBeLessThanOrEqual(overflow.clientWidth + 1) // tolerância de 1px
}

test.describe("Responsividade mobile — sem overflow horizontal (viewport 390x844)", () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test("cardápio (/)", async ({ page }) => {
    await page.goto("/")
    await assertNoHorizontalOverflow(page, "Cardápio")
  })

  test("checkout (/checkout)", async ({ page }) => {
    await page.goto("/checkout")
    await assertNoHorizontalOverflow(page, "Checkout")
  })

  test("confirmação (/confirmacao)", async ({ page }) => {
    await page.goto("/confirmacao")
    await assertNoHorizontalOverflow(page, "Confirmação")
  })

  test("admin — pedidos (Kanban)", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/pedidos")
    await assertNoHorizontalOverflow(page, "Admin Pedidos")
  })

  test("admin — estoque", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/estoque")
    await assertNoHorizontalOverflow(page, "Admin Estoque")
  })

  test("admin — cozinha", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/cozinha")
    await assertNoHorizontalOverflow(page, "Admin Cozinha")
  })

  test("admin — configurações", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/configuracoes")
    await assertNoHorizontalOverflow(page, "Admin Configurações")
  })
})
