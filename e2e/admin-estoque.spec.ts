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

    // Match exato — regex genérica de "frango grelhado" agora também bate no
    // placeholder do textarea de Ingredientes (B7/B12/B13), então precisa ser
    // o texto completo do placeholder do campo Nome pra não dar strict mode violation.
    await page.getByPlaceholder("Ex: Frango Grelhado com Arroz Integral (350g)").fill(newProductName)
    await page.getByPlaceholder("0,00").fill("25.90")
    await page.getByRole("button", { name: /adicionar ao cardápio/i }).click()

    await expect(page.getByText("Preencha os dados para adicionar ao cardápio")).not.toBeVisible({ timeout: 8000 })
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill(newProductName)
    // o card existe em duas versões no DOM (layout desktop e mobile, uma delas
    // sempre display:none via CSS) — .first() evita a violação de strict mode
    await expect(page.getByText(newProductName).first()).toBeVisible({ timeout: 5000 })
  })

  test("botão de editar não infla a altura da linha (nome/OK não ficam descolados da foto)", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill(fx.product.name)

    const editBtn = page.getByRole("button", { name: `Editar ${fx.product.name}` }).first()
    const box = await editBtn.boundingBox()
    // Regressão: chegou a ficar 44x44 (tamanho do stepper), empurrando o nome
    // pra cima e a barra de estoque pra baixo dentro da linha.
    expect(box?.height ?? 0).toBeLessThanOrEqual(32)
    expect(box?.width ?? 0).toBeLessThanOrEqual(32)
  })

  test("digita uma quantidade nova no campo entre os +/- e persiste no banco", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill("E2E_TEST")

    const qtyInput = page.getByRole("spinbutton", { name: `Quantidade de ${fx.product.name}` })
    await qtyInput.fill("42")
    await qtyInput.blur()
    await page.waitForTimeout(600) // mesmo debounce de salvamento usado no teste do stepper

    const sb = adminClient()
    const { data } = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    expect(data?.stock_quantity).toBe(42)

    // devolve o estoque a um valor neutro pra não afetar specs que rodam depois
    await resetProductStock(fx.product.id, 10)
  })

  test("cria produto com ingredientes, modo de preparo e tipo de arroz, e os dados persistem", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /novo produto/i }).click()

    const productName = `${newProductName} — Arroz`
    // Match exato — mesma razão do teste acima (colisão com o placeholder do
    // textarea de Ingredientes).
    await page.getByPlaceholder("Ex: Frango Grelhado com Arroz Integral (350g)").fill(productName)
    await page.getByPlaceholder("0,00").fill("22.50")
    // Ingredientes (C17): o textarea livre foi substituído pelo IngredientBuilder
    // — adiciona um ingrediente estruturado que ainda contém "brócolis" pra manter
    // a asserção original (o textarea antigo não existe mais).
    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("brócolis no vapor")
    await page.getByPlaceholder("Quantidade").fill("80")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    await expect(page.getByTestId("ingredient-row").filter({ hasText: "brócolis no vapor" })).toBeVisible()

    await page.getByPlaceholder(/descongelar 24h/i)
      .fill("Descongelar na geladeira por 24h. Aquecer no microondas por 3 minutos.")

    // Tipo de Estoque (C16): produto novo nasce como "Combo" por padrão, e o
    // seletor "Estoque de Arroz" só aparece pra produtos "Individual" (combo
    // mostra o composer de itens no lugar) — precisa trocar antes.
    await page.getByRole("button", { name: /^combo — pacote de produtos$/i }).click()
    await page.getByRole("button", { name: /^individual — produto único$/i }).click()

    // Estoque de Arroz (C16): troca do padrão "Sem arroz" para "Só arroz branco"
    // — o antigo seletor de 2 opções "Tipo de Arroz Servido" foi substituído
    // pelo de 4 opções "Estoque de Arroz" quando o C16 foi mesclado.
    await page.getByRole("button", { name: /^sem arroz$/i }).click()
    await page.getByRole("button", { name: /^só arroz branco$/i }).click()

    await page.getByRole("button", { name: /adicionar ao cardápio/i }).click()
    await expect(page.getByText("Preencha os dados para adicionar ao cardápio")).not.toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data } = await sb
      .from("products")
      .select("prep_instructions, rice_integral_available, rice_stock_mode, description")
      .eq("name", productName)
      .single()
    expect(data?.prep_instructions).toContain("Descongelar na geladeira")
    expect(data?.description).toContain("brócolis")
    expect(data?.rice_stock_mode).toBe("branco")
    expect(data?.rice_integral_available).toBe(false)

    await sb.from("products").delete().eq("name", productName)
    // catálogo de ingredientes é global e "name" é UNIQUE — sem isso o teste
    // falha ao rodar de novo (2ª tentativa de criar o mesmo ingrediente colide).
    await sb.from("ingredients").delete().eq("name", "brócolis no vapor")
  })

  test("cria produto com lista estruturada de ingredientes e gera a description automaticamente", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /novo produto/i }).click()

    const productName = `${newProductName} — Ingredientes`
    await page.getByPlaceholder("Ex: Frango Grelhado com Arroz Integral (350g)").fill(productName)
    await page.getByPlaceholder("0,00").fill("19.90")
    await page.getByRole("button", { name: /^combo — pacote de produtos$/i }).click()
    await page.getByRole("button", { name: /^individual — produto único$/i }).click()

    // Primeiro ingrediente — cria "Peito de frango grelhado" no catálogo.
    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("Peito de frango grelhado")
    await page.getByPlaceholder("Quantidade").fill("150")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Peito de frango grelhado" })).toBeVisible()

    // Segundo ingrediente.
    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("Arroz integral")
    await page.getByPlaceholder("Quantidade").fill("180")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Arroz integral" })).toBeVisible()

    await page.getByRole("button", { name: /adicionar ao cardápio/i }).click()
    await expect(page.getByText("Preencha os dados para adicionar ao cardápio")).not.toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data: product } = await sb.from("products").select("id, description").eq("name", productName).single()
    expect(product?.description).toBe("Peito de frango grelhado (150g), Arroz integral (180g)")

    const { data: rows } = await sb
      .from("product_ingredients")
      .select("quantity, unit, ingredients(name)")
      .eq("product_id", product!.id)
      .order("sort_order")
    expect(rows).toHaveLength(2)
    expect((rows as any[])[0].ingredients.name).toBe("Peito de frango grelhado")
    expect(Number((rows as any[])[0].quantity)).toBe(150)

    await sb.from("products").delete().eq("name", productName)
    // catálogo de ingredientes é global e "name" é UNIQUE — sem isso o teste
    // falha ao rodar de novo (2ª tentativa de criar o mesmo ingrediente colide).
    await sb.from("ingredients").delete().in("name", ["Peito de frango grelhado", "Arroz integral"])
  })

  test("edita ingredientes de um produto existente — adiciona um, remove outro", async ({ page }) => {
    const productName = `${newProductName} — Edição Ingredientes`
    const sb = adminClient()

    const { data: product } = await sb.from("products").insert({
      name: productName, price: 19.9, stock_type: "individual", is_active: true,
    }).select("id").single()
    const { data: ingredient } = await sb.from("ingredients")
      .upsert({ name: "Brócolis no vapor" }, { onConflict: "name" })
      .select("id").single()
    await sb.from("product_ingredients").insert({
      product_id: product!.id, ingredient_id: ingredient!.id, quantity: 80, unit: "g", sort_order: 0,
    })

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill(productName)
    await page.getByRole("button", { name: `Editar ${productName}` }).click()

    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Brócolis no vapor" })).toBeVisible()

    // Adiciona um segundo ingrediente.
    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("Cenoura")
    await page.getByPlaceholder("Quantidade").fill("50")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Cenoura" })).toBeVisible()

    // Remove o primeiro.
    await page.getByRole("button", { name: "Remover Brócolis no vapor" }).click()

    await page.getByRole("button", { name: /salvar altera/i }).click()
    await expect(page.getByText("Edite os detalhes do produto abaixo")).not.toBeVisible({ timeout: 8000 })

    const { data: rows } = await sb
      .from("product_ingredients")
      .select("quantity, ingredients(name)")
      .eq("product_id", product!.id)
    expect(rows).toHaveLength(1)
    expect((rows as any[])[0].ingredients.name).toBe("Cenoura")

    const { data: updated } = await sb.from("products").select("description").eq("id", product!.id).single()
    expect(updated?.description).toBe("Cenoura (50g)")

    await sb.from("products").delete().eq("id", product!.id)
    // "Cenoura" é criada via insert simples (não upsert) pelo fluxo de "+ Novo
    // ingrediente…" da UI — catálogo é global e "name" é UNIQUE, então sem
    // isso a 2ª execução falha ao tentar recriá-la (mesmo problema que a Task 3
    // já teve que contornar). "Brócolis no vapor" fica no catálogo de propósito
    // (é upsert acima, então recriá-la em execuções futuras é inofensivo).
    await sb.from("ingredients").delete().eq("name", "Cenoura")
  })

  test("edita produto existente e persiste ingredientes/modo de preparo alterados", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill(fx.product.name)
    await page.getByRole("button", { name: `Editar ${fx.product.name}` }).first().click()

    const prepText = `Instruções E2E ${fx.runTag}`
    await page.getByPlaceholder(/descongelar 24h/i).fill(prepText)
    await page.getByRole("button", { name: /salvar alterações/i }).click()
    await expect(page.getByText("Edite os detalhes do produto abaixo")).not.toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data } = await sb.from("products").select("prep_instructions").eq("id", fx.product.id).single()
    expect(data?.prep_instructions).toBe(prepText)
  })
})
