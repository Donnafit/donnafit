import { test, expect } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const fx = loadFixtures()
const instructionText = `Aquecer no microondas por 3 minutos. Teste E2E ${fx.runTag}.`

function adminClient() {
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
  )
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

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

  test("produto com ingredientes estruturados mostra a lista organizada, sem precisar clicar", async ({ page }) => {
    const sb = adminClient()
    const { data: product } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Ingredientes ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
      description: "texto legado que deve ser substituído pela lista",
    }).select("id").single()
    const { data: ingredient } = await sb.from("ingredients")
      .upsert({ name: "Filé de tilápia" }, { onConflict: "name" })
      .select("id").single()
    await sb.from("product_ingredients").insert({
      product_id: product!.id, ingredient_id: ingredient!.id, quantity: 120, unit: "g", sort_order: 0,
    })

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("Manual Ingredientes")
    await page.getByText("Manual Ingredientes", { exact: false }).first().click()

    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Filé de tilápia" })).toBeVisible()
    await expect(page.getByText("120g")).toBeVisible()
    await expect(page.getByText("texto legado")).not.toBeVisible()

    await sb.from("products").delete().eq("id", product!.id)
  })

  test("produto legado sem ingredientes estruturados continua mostrando a description livre", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("E2E_TEST")
    await page.getByText(fx.product.name, { exact: false }).first().click()

    // fx.product não tem linhas em product_ingredients — cai no fallback.
    await expect(page.getByText("Ingredientes")).toBeVisible()
    await expect(page.getByTestId("ingredient-row")).toHaveCount(0)
  })
})
