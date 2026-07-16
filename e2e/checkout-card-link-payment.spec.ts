import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()

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
  await resetProductStock(fx.product.id)
})

async function login(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Perfil" }).click()
  await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
  await page.getByPlaceholder("••••••••").fill(fx.customer.password)
  await page.locator("form").getByRole("button", { name: "Entrar" }).click()
  await page.waitForTimeout(500)
}

test.describe("Checkout — Cartão (link de pagamento)", () => {
  test("mostra o aviso de envio manual e não aplica nenhum desconto no resumo", async ({ page }) => {
    await login(page)
    await page.goto(`/produto/${fx.product.id}`)
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    await page.getByRole("button", { name: "Carrinho" }).first().click()
    await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
    await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
    await expect(page).toHaveURL(/\/checkout/)

    // Antes de selecionar: nenhum aviso de link manual visível.
    await expect(page.getByText(/link de pagamento será enviado manualmente/i)).not.toBeVisible()

    await page.getByRole("button", { name: /^Cartão \(link\)/ }).click()

    await expect(page.getByText(/o link de pagamento será enviado manualmente pelo whatsapp após a confirmação do pedido/i)).toBeVisible()
    // Sem badge nem linha de desconto — mesmo tratamento da Maquininha.
    await expect(page.getByText(/desconto de \d/i)).not.toBeVisible()
    await expect(page.getByText(/desconto pix/i)).not.toBeVisible()
  })

  test("fluxo completo cria o pedido sem desconto e a mensagem de WhatsApp traz o rótulo correto", async ({ page, context }) => {
    await login(page)
    await page.goto(`/produto/${fx.product.id}`)
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    await page.getByRole("button", { name: "Carrinho" }).first().click()
    await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
    await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
    await expect(page).toHaveURL(/\/checkout/)

    await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Link Cartão E2E")
    await page.getByPlaceholder("(41) 99999-9999").fill("41999993333")
    await page.getByRole("button", { name: /^Retirada/ }).click()
    await page.getByRole("button", { name: /^Cartão \(link\)/ }).click()

    const submit = page.getByRole("button", { name: /confirmar e abrir whatsapp/i })
    await expect(submit).toBeEnabled()

    const [popup] = await Promise.all([
      context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
      submit.click(),
    ])
    if (popup) await popup.close()

    await expect(page).toHaveURL(/\/confirmacao/, { timeout: 15_000 })
    await expect(page.getByText(/pedido confirmado/i)).toBeVisible()

    // Resumo na página de confirmação mostra o rótulo certo, sem desconto.
    await expect(page.getByText("Cartão (link de pagamento)")).toBeVisible()

    // Mensagem de WhatsApp real (parâmetro "wa" carregado do redirect) traz o
    // aviso pro atendente e nenhuma linha de desconto/pendência de PIX.
    const url = new URL(page.url())
    const waParam = url.searchParams.get("wa")
    expect(waParam).toBeTruthy()
    const waUrl = new URL(decodeURIComponent(waParam!))
    const message = waUrl.searchParams.get("text")
    expect(message).toBeTruthy()
    expect(message).toContain("Cartão (link de pagamento) — enviar link manualmente")
    expect(message).not.toContain("desconto")
    expect(message).not.toContain("Pagamento pendente")

    // Confirma no banco: sem desconto (subtotal === total, sem taxa de entrega no pickup).
    const { data: order } = await adminClient()
      .from("orders")
      .select("payment_method, subtotal, total")
      .eq("customer_phone", "41999993333")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    expect(order?.payment_method).toBe("card_link")
    expect(Number(order?.total)).toBe(Number(order?.subtotal))
  })
})

test.describe("API /api/orders — card_link nunca aplica desconto", () => {
  test("servidor grava payment_method=card_link e total sem desconto, mesmo se o cliente tentar forjar", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Card Link API E2E",
        customerPhone: "41999992222",
        deliveryType: "pickup",
        paymentMethod: "card_link",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 1,
        }],
        total: 0.01, // valor forjado, bem abaixo do real — servidor deve ignorar
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()

    const { data: order } = await adminClient().from("orders").select("payment_method, subtotal, total").eq("id", body.orderId).single()
    expect(order?.payment_method).toBe("card_link")
    expect(Number(order?.subtotal)).toBe(fx.product.price)
    expect(Number(order?.total)).toBe(fx.product.price) // sem desconto nenhum
  })
})
