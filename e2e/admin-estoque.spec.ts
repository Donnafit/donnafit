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

  test("cria produto com ingredientes, modo de preparo e tipo de arroz, e os dados persistem", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /novo produto/i }).click()

    const productName = `${newProductName} — Arroz`
    // Match exato — mesma razão do teste acima (colisão com o placeholder do
    // textarea de Ingredientes).
    await page.getByPlaceholder("Ex: Frango Grelhado com Arroz Integral (350g)").fill(productName)
    await page.getByPlaceholder("0,00").fill("22.50")
    await page.getByPlaceholder(/peito de frango grelhado, arroz integral/i)
      .fill("Peito de frango grelhado, arroz branco, brócolis no vapor")
    await page.getByPlaceholder(/descongelar 24h/i)
      .fill("Descongelar na geladeira por 24h. Aquecer no microondas por 3 minutos.")

    // Tipo de arroz: troca do padrão "Integral e branco" para "Somente arroz branco"
    await page.getByRole("button", { name: /integral e branco — cliente escolhe no checkout/i }).click()
    await page.getByRole("button", { name: /^somente arroz branco$/i }).click()

    await page.getByRole("button", { name: /adicionar ao cardápio/i }).click()
    await expect(page.getByText("Preencha os dados para adicionar ao cardápio")).not.toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data } = await sb
      .from("products")
      .select("prep_instructions, rice_integral_available, description")
      .eq("name", productName)
      .single()
    expect(data?.prep_instructions).toContain("Descongelar na geladeira")
    expect(data?.description).toContain("brócolis")
    expect(data?.rice_integral_available).toBe(false)

    await sb.from("products").delete().eq("name", productName)
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
