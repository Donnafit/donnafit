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

  test("trocar de produto enquanto o fetch de Editar está em andamento não força edição com dados do produto errado", async ({ page }) => {
    const sb = adminClient()

    // Produto A: tem ingredientes estruturados — sua resposta de fetch será
    // atrasada artificialmente pra abrir a janela de corrida.
    const { data: productA } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Race A ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
    }).select("id").single()
    const { data: ingredient } = await sb.from("ingredients")
      .upsert({ name: "Espinafre refogado" }, { onConflict: "name" })
      .select("id").single()
    await sb.from("product_ingredients").insert({
      product_id: productA!.id, ingredient_id: ingredient!.id, quantity: 60, unit: "g", sort_order: 0,
    })

    // Produto B: description legada — é quem não pode ser corrompido se a
    // resposta atrasada de A chegar depois do usuário já ter trocado pra B.
    const legacyDescriptionB = "Descrição legada do produto B — não pode ser sobrescrita"
    const { data: productB } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Race B ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
      description: legacyDescriptionB,
    }).select("id").single()

    await loginAdmin(page)

    // Atrasa só a resposta do fetch de ingredientes disparado por
    // startEditing pro produto A — outras chamadas (incluindo o fetch
    // passivo de visualização de B) seguem normais.
    await page.route("**/rest/v1/product_ingredients*", async (route) => {
      if (route.request().url().includes(productA!.id)) {
        await new Promise((r) => setTimeout(r, 1500))
      }
      await route.continue()
    })

    await page.getByPlaceholder("Buscar produto...").fill("Manual Race A")
    await page.getByText("Manual Race A", { exact: false }).first().click()
    await page.getByRole("button", { name: "Editar", exact: true }).click()

    // Antes do fetch atrasado de A resolver, troca pro produto B.
    await page.getByPlaceholder("Buscar produto...").fill("Manual Race B")
    await page.getByText("Manual Race B", { exact: false }).first().click()

    // Espera além do delay artificial: se a corrida não estivesse fechada, é
    // aqui que a resposta tardia de A forçaria modo de edição com os dados
    // de A por cima do produto B, atualmente exibido — startEditing() é o
    // escopo desta correção (Task 6); o efeito passivo de visualização
    // (Task 5) tem uma corrida semelhante e já conhecida/aceita como Minor
    // separadamente, então esta asserção mira só o que startEditing garante:
    // não entrar em modo de edição com o produto errado.
    await page.waitForTimeout(2000)
    await expect(page.getByRole("button", { name: "Editar", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar" })).not.toBeVisible()

    // Confirmação mais forte, direto no banco: clicando "Editar" de verdade
    // agora em B (ação real do usuário, sem corrida — o fetch é novo, mira o
    // id de B, não passa pelo delay artificial de A) e salvando sem alterar
    // nada, B não pode ter ganhado o ingrediente de A nem perdido sua
    // description legada. Checagem via banco (não via texto na tela) porque
    // o bloco de visualização de ingredientes (Task 5) tem sua própria
    // corrida, separada e já conhecida, que deixa texto de A momentaneamente
    // na tela — não é o que esta correção (Task 6, startEditing) garante.
    await page.getByRole("button", { name: "Editar", exact: true }).click()
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(page.getByText("Salvar")).not.toBeVisible({ timeout: 8000 })

    const { data: updatedB } = await sb.from("products").select("description").eq("id", productB!.id).single()
    expect(updatedB?.description).toBe(legacyDescriptionB)
    const { data: linksB } = await sb.from("product_ingredients").select("id").eq("product_id", productB!.id)
    expect(linksB).toHaveLength(0)

    await sb.from("products").delete().in("id", [productA!.id, productB!.id])
    await sb.from("ingredients").delete().eq("name", "Espinafre refogado")
  })
})
