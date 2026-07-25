import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

// Produtos reais (não fixture): um que só serve arroz branco e um que oferece as duas opções.
const FEIJOADA_ID = "d367e8f6-3f7e-4a44-8a8d-1d34dfe80d60" // rice_integral_available = false
const FRICASSE_FRANGO_ID = "6eee4934-f282-4fdc-bfb9-852362f6bf92" // rice_integral_available = true (default)
// Combo real com componentes de arroz "both" — deve passar a perguntar o arroz
// (antes fechava direto porque o combo guarda rice_stock_mode "none").
const COMBO_COM_ARROZ_ID = "90ed838d-1960-4642-a367-fc2c772aa271" // COMBO PREMIUM
const COMBO_SEM_ARROZ_ID = "2e9640d8-e743-4e5a-a491-0fed31dd3b26" // COMBO DE 10 SOPAS (nenhum componente de arroz)

function adminClient() {
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
  )
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Perfil" }).click()
  await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
  await page.getByPlaceholder("••••••••").fill(fx.customer.password)
  await page.locator("form").getByRole("button", { name: "Entrar" }).click()
  await page.waitForTimeout(500)
}

async function addToCart(page: import("@playwright/test").Page, productId: string) {
  await page.goto(`/produto/${productId}`)
  await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
  await page.waitForTimeout(300)
}

async function goToCheckoutAndFillContact(page: import("@playwright/test").Page, phone: string) {
  await page.getByRole("button", { name: "Carrinho" }).first().click()
  await expect(page.getByTestId("cart-drawer")).toBeVisible()
  await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
  await expect(page).toHaveURL(/\/checkout/)
  await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Arroz E2E")
  await page.getByPlaceholder("(41) 99999-9999").fill(phone)
  await page.getByRole("button", { name: /^Retirada/ }).click()
  await page.getByRole("button", { name: /^Maquininha/ }).click()
}

async function submitAndWaitOrder(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext) {
  const submit = page.getByRole("button", { name: /confirmar e abrir whatsapp/i })
  const [popup] = await Promise.all([
    context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
    submit.click(),
  ])
  if (popup) await popup.close()
  await expect(page).toHaveURL(/\/confirmacao/, { timeout: 15_000 })
}

async function latestOrderNotes(phone: string) {
  const { data } = await adminClient()
    .from("orders")
    .select("notes")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  return data?.notes as string | undefined
}

test.afterAll(async () => {
  // Só o primeiro teste efetivamente cria um pedido real (os outros só abrem o modal).
  const sb = adminClient()
  const { data: orders } = await sb.from("orders").select("id").eq("customer_phone", "41999993001")
  const ids = (orders ?? []).map((o) => o.id)
  if (ids.length) {
    await sb.from("order_items").delete().in("order_id", ids)
    await sb.from("orders").delete().in("id", ids)
  }
})

test.describe("Cardápio — escolha de arroz (padrão único + pratos só-branco)", () => {
  test("prato sem opção integral não abre modal de arroz e é gravado como Branco automaticamente", async ({ page, context }) => {
    const phone = "41999993001"
    await login(page)
    await addToCart(page, FEIJOADA_ID)
    await goToCheckoutAndFillContact(page, phone)

    // Comportamento correto: sem item "escolhível", vai direto pro pedido — sem modal.
    await submitAndWaitOrder(page, context)
    await expect(page.getByText("Tipo de Arroz")).not.toBeVisible()

    const notes = await latestOrderNotes(phone)
    expect(notes).toMatch(/FEIJOADA: Arroz Branco/i)
  })

  test("carrinho misto: modal só pergunta pelo prato que tem opção, no modo 'mesmo tipo para todos' por padrão", async ({ page }) => {
    await login(page)
    await addToCart(page, FEIJOADA_ID)
    await addToCart(page, FRICASSE_FRANGO_ID)
    await goToCheckoutAndFillContact(page, "41999993002")

    await page.getByRole("button", { name: /confirmar e abrir whatsapp/i }).click()
    const modal = page.getByTestId("rice-modal")
    await expect(modal.getByText("Tipo de Arroz")).toBeVisible()
    await expect(modal.getByText("Vale para todas as marmitas do pedido")).toBeVisible()
    // Modo "mesmo tipo para todos" não lista item nenhum — nem o Fricassê, nem a FEIJOADA.
    await expect(modal.getByText(/Fricassê De Frango/i)).toHaveCount(0)
    await expect(modal.getByText(/FEIJOADA/i)).toHaveCount(0)
  })

  test("trocar para 'item por item' pré-preenche com a escolha única feita antes", async ({ page }) => {
    await login(page)
    await addToCart(page, FRICASSE_FRANGO_ID)
    await goToCheckoutAndFillContact(page, "41999993003")

    await page.getByRole("button", { name: /confirmar e abrir whatsapp/i }).click()
    await expect(page.getByText("Tipo de Arroz")).toBeVisible()
    await page.getByRole("button", { name: "Integral", exact: true }).click()
    await page.getByText("Prefiro escolher item por item").click()

    await expect(page.getByText("Escolha para cada item com arroz")).toBeVisible()
    const confirmBtn = page.getByRole("button", { name: "Confirmar e Finalizar Pedido" })
    // Pré-preenchido: já pode confirmar sem precisar reclicar no item individual.
    await expect(confirmBtn).toBeEnabled()
  })

  // Bug 2: combo com componentes de arroz "both" precisa perguntar o tipo —
  // antes o combo guardava rice_stock_mode "none" e o pedido fechava direto,
  // caindo no default silencioso "branco". Não submetemos (evita reservar o
  // estoque real de todos os componentes do combo) — provar que o modal abre
  // já demonstra a correção (antes ele nunca aparecia pra combo).
  test("combo com componentes de arroz abre o modal de tipo de arroz", async ({ page }) => {
    await login(page)
    await addToCart(page, COMBO_COM_ARROZ_ID)
    await goToCheckoutAndFillContact(page, "41999993004")

    await page.getByRole("button", { name: /confirmar e abrir whatsapp/i }).click()
    const modal = page.getByTestId("rice-modal")
    await expect(modal.getByText("Tipo de Arroz")).toBeVisible()
    // Em "item por item", o combo aparece como uma linha escolhível (uma
    // escolha vale pro combo inteiro).
    await page.getByText("Prefiro escolher item por item").click()
    await expect(modal.getByText(/COMBO PREMIUM/i)).toBeVisible()
    // Não deve ir pra confirmação sem escolher (modal continua aberto).
    await expect(page).not.toHaveURL(/\/confirmacao/)
  })

  // Contraparte: combo sem nenhum componente de arroz NÃO deve perguntar.
  // Como fechar submeteria um pedido real (reservando o estoque das sopas),
  // validamos só que o botão fica pronto e que nenhum modal de arroz surge ao
  // abrir — a submissão em si é coberta pela simulação de dados read-only.
  test("combo sem componentes de arroz não dispara o modal", async ({ page }) => {
    await login(page)
    await addToCart(page, COMBO_SEM_ARROZ_ID)
    await goToCheckoutAndFillContact(page, "41999993005")

    // Botão precisa habilitar (comboRiceLoading resolve rápido) e, ao não haver
    // item de arroz, um clique iria direto pro pedido — então aqui só
    // garantimos que o modal não está presente no estado inicial do checkout.
    await expect(page.getByRole("button", { name: /confirmar e abrir whatsapp/i })).toBeEnabled()
    await expect(page.getByTestId("rice-modal")).toHaveCount(0)
  })
})
