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

  test("pedido combo desconta estoque imediatamente no checkout e não é afetado ao avançar status", async ({ request }) => {
    const sb = adminClient()
    const { data: comboProduct } = await sb
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
    expect(afterCheckout.data?.stock_quantity).toBe(8)

    await sb.from("orders").update({ status: "production" }).eq("id", orderId)

    const afterProduction = await sb.from("products").select("stock_quantity").eq("id", comboProduct!.id).single()
    expect(afterProduction.data?.stock_quantity).toBe(8)

    await sb.from("order_items").delete().eq("order_id", orderId)
    await sb.from("orders").delete().eq("id", orderId)
    await sb.from("products").delete().eq("id", comboProduct!.id)
  })
})
