import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()
const newProductName = `[E2E_TEST] Produto Criado ${fx.runTag}`

function adminClient() {
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
  )
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

test.beforeAll(async () => {
  await resetProductStock(fx.product.id, 10)
})

test.afterAll(async () => {
  // não existe botão de excluir produto na UI — limpa o produto criado neste teste via service role
  await adminClient().from("products").delete().eq("name", newProductName)
})

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/estoque")
}

test.describe("Admin — Estoque", () => {
  test("ajusta a quantidade pelo stepper e persiste no banco", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill("E2E_TEST")

    await page.getByRole("button", { name: `Aumentar estoque de ${fx.product.name}` }).click()
    await page.waitForTimeout(600) // debounce de salvamento

    const sb = adminClient()
    const { data } = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    expect(data?.stock_quantity).toBe(11)
  })

  test("cria um novo produto pelo modal e ele aparece na lista", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /novo produto/i }).click()

    await page.getByPlaceholder(/frango grelhado/i).fill(newProductName)
    await page.getByPlaceholder("0,00").fill("25.90")
    await page.getByRole("button", { name: /adicionar ao cardápio/i }).click()

    await expect(page.getByText("Preencha os dados para adicionar ao cardápio")).not.toBeVisible({ timeout: 8000 })
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill(newProductName)
    // o card existe em duas versões no DOM (layout desktop e mobile, uma delas
    // sempre display:none via CSS) — .first() evita a violação de strict mode
    await expect(page.getByText(newProductName).first()).toBeVisible({ timeout: 5000 })
  })
})
