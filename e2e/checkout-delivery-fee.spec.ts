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

async function addToCartAndGoToCheckout(page: import("@playwright/test").Page) {
  await login(page)
  await page.goto(`/produto/${fx.product.id}`)
  await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
  // Frete mínimo de 8 marmitas (B14) — sem isso, o botão "Entrega" abaixo
  // fica desabilitado e os testes deste describe quebram.
  // Locator escopado a <main>: o CartDrawer (montado globalmente pelo Header,
  // fora de <main>, off-screen quando fechado) renderiza um botão com o MESMO
  // aria-label "Adicionar mais um" assim que o item entra no carrinho —
  // sem escopo, o locator fica ambíguo (2 matches) e o clique trava até
  // o timeout tentando interagir com o botão fora da viewport do drawer.
  for (let i = 1; i < 8; i++) {
    await page.locator("main").getByRole("button", { name: "Adicionar mais um" }).click()
  }
  await page.getByRole("button", { name: "Carrinho" }).first().click()
  await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
  await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
  await expect(page).toHaveURL(/\/checkout/, { timeout: 10_000 })
  await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Frete E2E")
  await page.getByPlaceholder("(41) 99999-9999").fill("41999997777")
  await page.getByRole("button", { name: /^Entrega/ }).click()
}

test.describe("Cardápio — frete reconhecido pelo endereço (sem seleção manual de bairro)", () => {
  test("não existe select de bairro — só um campo de endereço livre", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await expect(page.locator("select")).toHaveCount(0)
    await expect(page.getByPlaceholder(/rua, número, bairro, complemento/i)).toBeVisible()
  })

  test("endereço com bairro reconhecido calcula o frete automaticamente e habilita o envio", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder(/rua, número, bairro, complemento/i).fill("Rua Presidente Faria, 100, Batel")

    await expect(page.getByText(/bairro identificado: batel/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/frete r\$\s?12,00/i)).toBeVisible()
    // Resumo do pedido reflete o mesmo frete.
    await expect(page.getByText("Frete", { exact: true })).toBeVisible()
  })

  test("endereço sem bairro reconhecível bloqueia o envio e orienta o cliente", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder(/rua, número, bairro, complemento/i).fill("Rua Inventada Sem Bairro Nenhum, 42")

    await expect(page.getByText(/não conseguimos identificar o bairro/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole("button", { name: /confirmar e abrir whatsapp/i })).toBeDisabled()
  })
})

test.describe("API /api/orders — frete nunca confia no valor do cliente", () => {
  test("servidor recalcula o frete pelo endereço, ignorando o valor forjado pelo cliente", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Frete API E2E",
        customerPhone: "41999996666",
        deliveryType: "delivery",
        deliveryAddress: "Rua Comendador Araújo, 500, Batel",
        deliveryFee: 999,
        paymentMethod: "card",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 1,
        }],
        total: fx.product.price,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    expect(body.orderId).toBeTruthy()

    const { data: order } = await adminClient().from("orders").select("total").eq("id", body.orderId).single()
    // Comportamento correto: total = preço do produto + taxa REAL do Batel (R$12),
    // nunca o frete forjado de R$999 enviado pelo cliente.
    expect(Number(order?.total)).toBeCloseTo(fx.product.price + 12, 2)
  })

  test("bairro não reconhecido no endereço é rejeitado com 400", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Frete Inválido E2E",
        customerPhone: "41999995555",
        deliveryType: "delivery",
        deliveryAddress: "Rua Sem Bairro Nenhum Cadastrado, 1",
        paymentMethod: "card",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 1,
        }],
        total: fx.product.price,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/não foi possível identificar o bairro/i)
  })
})

test.describe("Endereço com complemento não deve atrapalhar o reconhecimento do bairro", () => {
  test("endereço sem bairro escrito, mas com complemento 'Sala X', geocodifica corretamente", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder(/rua, número, bairro, complemento/i)
      .fill("Rua Marechal Deodoro, 630 - Sala 12")

    // Sem stripping, o Nominatim recebe a query poluída pelo complemento e
    // não geocodifica nada — o teste fica preso em "não conseguimos identificar".
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/frete r\$\s?10,00/i)).toBeVisible()
  })

  test("endereço sem bairro escrito, mas com complemento 'apto 302', geocodifica corretamente", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder(/rua, número, bairro, complemento/i)
      .fill("Rua Padre Anchieta, 2000, apto 302")

    // Esse trecho da Rua Padre Anchieta fica bem na divisa entre Campina do
    // Siqueira e Bigorrilho — o Nominatim (serviço público, múltiplos
    // servidores/réplicas) responde ora com um bairro, ora com o outro para a
    // mesma consulta (verificado ao vivo: curl retornou "Campina do Siqueira"
    // de forma consistente, enquanto o fetch do servidor Next.js, nesta mesma
    // rede, retornou "Bigorrilho" de forma igualmente consistente). Os dois
    // são zonas reais e ativas com a MESMA taxa (R$ 12,00), então a asserção
    // fixa no frete (estável) e aceita qualquer um dos dois bairros — travar
    // num nome só tornaria o teste refém de qual réplica do Nominatim atende
    // a requisição.
    await expect(page.getByText(/bairro identificado: (campina do siqueira|bigorrilho)/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/frete r\$\s?12,00/i)).toBeVisible()
  })
})

test.describe("API /api/orders — bairro com complemento também é resolvido no servidor", () => {
  test("endereço com complemento resolve o mesmo bairro que sem complemento", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Complemento E2E",
        customerPhone: "41999994444",
        deliveryType: "delivery",
        deliveryAddress: "Rua Marechal Deodoro, 630 - Sala 12",
        paymentMethod: "card",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 1,
        }],
        total: fx.product.price,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    const { data: order } = await adminClient().from("orders").select("total").eq("id", body.orderId).single()
    // Frete real do Centro (R$ 10) — só é possível se o servidor conseguiu
    // geocodificar o endereço com o complemento removido.
    expect(Number(order?.total)).toBeCloseTo(fx.product.price + 10, 2)
  })
})
