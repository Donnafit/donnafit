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

  test("edita ingredientes direto pelo Manual de Preparo e reflete na visualização", async ({ page }) => {
    const sb = adminClient()
    const { data: product } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Editar Ingredientes ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
    }).select("id").single()
    // Nome do ingrediente único por execução (não só por fixture/runTag):
    // ingredientes nunca são apagados entre testes (catálogo compartilhado
    // por design), então reusar o mesmo nome numa segunda execução com o
    // mesmo runTag violaria a constraint de unicidade em `ingredients.name`.
    const ingredientName = `Batata doce ${fx.runTag}-${Date.now()}`

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("Manual Editar Ingredientes")
    await page.getByText("Manual Editar Ingredientes", { exact: false }).first().click()
    await page.getByRole("button", { name: "Editar", exact: true }).click()

    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill(ingredientName)
    await page.getByPlaceholder("Quantidade").fill("100")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    // onCreateIngredient faz um round-trip de rede antes de fechar o popover
    // e atualizar editIngredientRows — espera a linha aparecer no modo de
    // edição antes de salvar, senão o clique em "Salvar" pode disparar antes
    // do estado ser atualizado.
    await expect(page.getByTestId("ingredient-row").filter({ hasText: ingredientName })).toBeVisible()

    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Salvar")).not.toBeVisible({ timeout: 8000 })

    await expect(page.getByTestId("ingredient-row").filter({ hasText: ingredientName })).toBeVisible()

    const { data: updated } = await sb.from("products").select("description").eq("id", product!.id).single()
    expect(updated?.description).toBe(`${ingredientName} (100g)`)

    await sb.from("products").delete().eq("id", product!.id)
  })

  test("salvar modo de preparo sem mexer nos ingredientes não apaga a description legada", async ({ page }) => {
    const sb = adminClient()
    const legacyDescription = "Descrição legada que não pode sumir"
    const { data: product } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Preserva Legado ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
      description: legacyDescription,
    }).select("id").single()

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("Manual Preserva Legado")
    await page.getByText("Manual Preserva Legado", { exact: false }).first().click()
    await page.getByRole("button", { name: "Editar" }).click()
    await page.getByPlaceholder(/descreva o passo a passo/i).fill("Aquecer por 3 minutos.")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Salvar")).not.toBeVisible({ timeout: 8000 })

    const { data: updated } = await sb.from("products").select("description").eq("id", product!.id).single()
    expect(updated?.description).toBe(legacyDescription)

    await sb.from("products").delete().eq("id", product!.id)
  })
})
