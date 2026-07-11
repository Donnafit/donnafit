import { test, expect } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

test.describe("Admin — login e controle de acesso", () => {
  test("acessar /admin/pedidos sem sessão redireciona para /acessoadmin", async ({ page }) => {
    await page.goto("/admin/pedidos")
    await expect(page).toHaveURL(/\/acessoadmin/)
  })

  test("senha errada mostra erro genérico", async ({ page }) => {
    await page.goto("/acessoadmin")
    await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
    await page.getByPlaceholder("••••••••").fill("senha-errada-123")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible()
  })

  test("conta sem cargo autorizado (cliente) é barrada mesmo com senha certa", async ({ page }) => {
    await page.goto("/acessoadmin")
    await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
    await page.getByPlaceholder("••••••••").fill(fx.customer.password)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByText(/n[aã]o tem acesso ao painel administrativo/i)).toBeVisible()
    await expect(page).toHaveURL(/\/acessoadmin/)
  })

  test("login de admin válido chega em /admin/pedidos", async ({ page }) => {
    await page.goto("/acessoadmin")
    await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
    await page.getByPlaceholder("••••••••").fill(fx.admin.password)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  })

  test("sessão de equipe já ativa pula o formulário ao reabrir /acessoadmin", async ({ page }) => {
    await page.goto("/acessoadmin")
    await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
    await page.getByPlaceholder("••••••••").fill(fx.admin.password)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })

    // Comportamento correto (antes pedia login de novo sempre): reabrir a
    // tela de login com sessão ainda ativa redireciona sozinho pro painel.
    await page.goto("/acessoadmin")
    await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  })
})
