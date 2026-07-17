import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()

test.beforeAll(async () => {
  await resetProductStock(fx.product.id)
})

function env() {
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      })
  )
}

function adminClient() {
  const e = env()
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function baseItem(overrides: Partial<{ price: number; quantity: number }> = {}) {
  return {
    product: {
      id: fx.product.id,
      name: fx.product.name,
      sku: `E2E-TEST-${fx.runTag}`,
      price: overrides.price ?? fx.product.price,
      stock_type: "avulso",
      category_id: null,
    },
    quantity: overrides.quantity ?? 1,
  }
}

test.describe("API /api/orders — integridade de preço e estoque", () => {
  test("preço enviado pelo cliente é ignorado — servidor deve usar o preço real do banco", async ({ request }) => {
    const tamperedPrice = 0.01
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Preço E2E",
        customerPhone: "41999990000",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [baseItem({ price: tamperedPrice })],
        total: tamperedPrice,
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    const sb = adminClient()
    const { data: order } = await sb.from("orders").select("subtotal, total").eq("id", body.orderId).single()
    const { data: items } = await sb.from("order_items").select("unit_price").eq("order_id", body.orderId)

    // Comportamento correto: preço gravado deve ser o real do produto (fx.product.price),
    // não o valor manipulado enviado pelo cliente.
    expect(items?.[0]?.unit_price).toBe(fx.product.price)
    expect(order?.subtotal).toBe(fx.product.price)
  })

  test("duas compras simultâneas do último item em estoque (avulso) não podem oversell", async ({ request }) => {
    const sb = adminClient()
    await sb.from("products").update({ stock_quantity: 1 }).eq("id", fx.product.id)

    const [resA, resB] = await Promise.all([
      request.post("/api/orders", {
        data: {
          customerName: "Corrida A E2E",
          customerPhone: "41999990001",
          deliveryType: "pickup",
          paymentMethod: "card",
          items: [baseItem({ quantity: 1 })],
          total: fx.product.price,
        },
      }),
      request.post("/api/orders", {
        data: {
          customerName: "Corrida B E2E",
          customerPhone: "41999990002",
          deliveryType: "pickup",
          paymentMethod: "card",
          items: [baseItem({ quantity: 1 })],
          total: fx.product.price,
        },
      }),
    ])

    const oks = [resA, resB].filter((r) => r.ok())
    // Comportamento correto: só 1 dos 2 pedidos concorrentes deve ser aceito
    // quando só existe 1 unidade em estoque — o outro deve falhar de forma explícita.
    expect(oks.length).toBe(1)

    const { data: product } = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    expect(product?.stock_quantity).toBe(0)
  })

  test("pedido avulso desconta estoque uma única vez no checkout — avançar para produção não desconta de novo", async ({ request }) => {
    const sb = adminClient()
    await sb.from("products").update({ stock_quantity: 10 }).eq("id", fx.product.id)

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Dupla Baixa Avulso E2E",
        customerPhone: "41999994444",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [baseItem({ quantity: 3 })], // stock_type: "avulso" (ver baseItem())
        total: fx.product.price * 3,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const { orderId } = await res.json()

    // Checkout já deve ter descontado 3 (baixa imediata, tanto pra combo
    // quanto pra avulso — proteção contra overselling, ver route.ts).
    const afterCheckout = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    expect(afterCheckout.data?.stock_quantity).toBe(7)

    // Avança o pedido para "production" — antes da correção, o trigger
    // on_order_status_production baixava esses mesmos 3 de novo (dupla baixa).
    await sb.from("orders").update({ status: "production" }).eq("id", orderId)

    const afterProduction = await sb.from("products").select("stock_quantity").eq("id", fx.product.id).single()
    // Comportamento correto: continua 7 — nenhuma baixa adicional no trigger.
    expect(afterProduction.data?.stock_quantity).toBe(7)
  })

  test("pedido de combo sem composição cadastrada não mexe no stock_quantity do próprio combo (nem no checkout, nem ao avançar status)", async ({ request }) => {
    // Pré-C16 este teste esperava o combo descontar a própria stock_quantity
    // no checkout (10 -> 8). Com o C16 (estoque por componente via
    // combo_items — ver e2e/api-orders-stock-variants.spec.ts para o caso
    // com composição cadastrada), combo deixou de ter baixa própria: um
    // combo sem combo_items simplesmente não gera nenhuma operação de
    // estoque (só um console.warn no servidor). O que este teste continua
    // protegendo é a ausência de dupla-baixa do trigger antigo — agora
    // expressa como "stock_quantity permanece 10 o tempo todo".
    const sb = adminClient()
    const { data: comboProduct, error: comboInsertErr } = await sb
      .from("products")
      .insert({
        name: `[E2E_TEST] Combo Dupla Baixa ${fx.runTag}`,
        sku: `E2E-COMBO-${fx.runTag}`,
        price: 30,
        stock_type: "combo",
        stock_quantity: 10,
        min_stock_alert: 2,
        is_active: true,
        sort_order: 9999,
      })
      .select()
      .single()
    expect(comboInsertErr, comboInsertErr?.message).toBeNull()

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Dupla Baixa Combo E2E",
        customerPhone: "41999993333",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [{
          product: { id: comboProduct!.id, name: comboProduct!.name, sku: comboProduct!.sku, price: 30, stock_type: "combo", category_id: null },
          quantity: 2,
        }],
        total: 60,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const { orderId } = await res.json()

    const afterCheckout = await sb.from("products").select("stock_quantity").eq("id", comboProduct!.id).single()
    expect(afterCheckout.data?.stock_quantity).toBe(10)

    await sb.from("orders").update({ status: "production" }).eq("id", orderId)

    const afterProduction = await sb.from("products").select("stock_quantity").eq("id", comboProduct!.id).single()
    expect(afterProduction.data?.stock_quantity).toBe(10)

    await sb.from("order_items").delete().eq("order_id", orderId)
    await sb.from("orders").delete().eq("id", orderId)
    await sb.from("products").delete().eq("id", comboProduct!.id)
  })

  test("combo ativo com stock_quantity=0 (estado normal pós-C16) continua vendável no cardápio", async ({ page }) => {
    // Regressão: ProductCard/ProductDetailClient calculavam soldOut a partir
    // de stock_quantity, que o C16 zerou para TODO combo (a fonte de verdade
    // virou combo_items) — sem esse ajuste, nenhum combo aparecia comprável
    // no site.
    const sb = adminClient()
    const productName = `[E2E_TEST] Combo Sempre Disponível ${fx.runTag}`
    const { data: comboProduct, error: comboInsertErr } = await sb
      .from("products")
      .insert({
        name: productName,
        sku: `E2E-COMBO-SOLDOUT-${fx.runTag}`,
        price: 30,
        stock_type: "combo",
        stock_quantity: 0,
        min_stock_alert: 2,
        is_active: true,
        sort_order: 9999,
      })
      .select()
      .single()
    expect(comboInsertErr, comboInsertErr?.message).toBeNull()

    await page.goto("/")
    const card = page.locator(`[data-product-id="${comboProduct!.id}"]`)
    await expect(card).toBeVisible({ timeout: 10_000 })
    await expect(card.getByText(/esgotado/i)).not.toBeVisible()
    await expect(card.getByLabel(/adicionar ao carrinho/i)).toBeVisible()

    await sb.from("products").delete().eq("id", comboProduct!.id)
  })
})
