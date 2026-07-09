import { test, expect } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/qrcode")
}

test.describe("Admin — QR Code", () => {
  test("QR code renderiza e o card de impressão está isolado do resto da página", async ({ page }) => {
    await loginAdmin(page)

    const printCard = page.locator(".qr-print-card")
    await expect(printCard).toBeVisible({ timeout: 5000 })
    await expect(printCard.locator("svg").first()).toBeVisible()
    await expect(printCard.getByText("DONNA FIT")).toBeVisible()
    // a regra @media print que isola o card do resto da página deve existir no DOM
    const hasPrintRule = await page.evaluate(() => {
      return Array.from(document.styleSheets).some((sheet) => {
        try {
          return Array.from(sheet.cssRules).some(
            (rule) => rule instanceof CSSMediaRule && rule.conditionText.includes("print")
              && Array.from(rule.cssRules).some((r) => (r as CSSStyleRule).selectorText?.includes("qr-print-card"))
          )
        } catch { return false }
      })
    })
    expect(hasPrintRule).toBeTruthy()

    await expect(page.getByRole("button", { name: /imprimir qr code/i })).toBeVisible()
  })
})
