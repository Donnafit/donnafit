import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

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

const createdProductIds: string[] = []

async function createProduct(overrides: Record<string, unknown>) {
  const sb = adminClient()
  const { data, error } = await sb
    .from("products")
    .insert({
      name: `[E2E_TEST] Estoque Variante ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      price: 10,
      is_active: true,
      stock_type: "individual",
      stock_quantity: 0,
      min_stock_alert: 5,
      rice_stock_mode: "none",
      ...overrides,
    })
    .select()
    .single()
  if (error) throw new Error(`Falha ao criar produto de teste: ${error.message}`)
  createdProductIds.push(data.id)
  return data
}

function orderItem(product: { id: string; name: string; price: number }, quantity: number) {
  return {
    product: { id: product.id, name: product.name, sku: null, price: product.price, stock_type: "individual", category_id: null },
    quantity,
  }
}

test.afterEach(async () => {
  const sb = adminClient()
  const phones = ["41999995001", "41999995002", "41999995003", "41999995004"]
  const { data: orders } = await sb.from("orders").select("id").in("customer_phone", phones)
  const orderIds = (orders ?? []).map((o) => o.id)
  if (orderIds.length) {
    await sb.from("order_items").delete().in("order_id", orderIds)
    await sb.from("orders").delete().in("id", orderIds)
  }
  if (createdProductIds.length) {
    await sb.from("combo_items").delete().in("combo_product_id", createdProductIds)
    await sb.from("products").delete().in("id", createdProductIds)
    createdProductIds.length = 0
  }
})

test.describe("API /api/orders — integridade de estoque por tipo de arroz e combos", () => {
  test("rice_stock_mode='both': pedido de 'integral' baixa só rice_stock_integral", async ({ request }) => {
    const product = await createProduct({ rice_stock_mode: "both", rice_stock_integral: 5, rice_stock_branco: 5 })

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Arroz Integral E2E",
        customerPhone: "41999995001",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem(product, 2)],
        total: product.price * 2,
        riceChoices: { [product.id]: "integral" },
      },
    })
    expect(res.ok()).toBeTruthy()

    const sb = adminClient()
    const { data } = await sb.from("products").select("rice_stock_integral, rice_stock_branco").eq("id", product.id).single()
    expect(data?.rice_stock_integral).toBe(3)
    expect(data?.rice_stock_branco).toBe(5)
  })

  test("rice_stock_mode='both': estoque insuficiente no tipo escolhido bloqueia o pedido e não mexe no outro tipo", async ({ request }) => {
    const product = await createProduct({ rice_stock_mode: "both", rice_stock_integral: 1, rice_stock_branco: 10 })

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Arroz Insuficiente E2E",
        customerPhone: "41999995002",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem(product, 2)],
        total: product.price * 2,
        riceChoices: { [product.id]: "integral" },
      },
    })
    expect(res.ok()).toBeFalsy()
    expect(res.status()).toBe(409)

    const sb = adminClient()
    const { data } = await sb.from("products").select("rice_stock_integral, rice_stock_branco").eq("id", product.id).single()
    expect(data?.rice_stock_integral).toBe(1)
    expect(data?.rice_stock_branco).toBe(10)
  })

  test("combo: baixa o estoque de cada componente multiplicado pela quantidade do combo", async ({ request }) => {
    const componentA = await createProduct({ stock_quantity: 20 })
    const componentB = await createProduct({ stock_quantity: 20 })
    const combo = await createProduct({ stock_type: "combo", stock_quantity: 0 })

    const sb = adminClient()
    const { error: comboItemsErr } = await sb.from("combo_items").insert([
      { combo_product_id: combo.id, component_product_id: componentA.id, quantity: 2 },
      { combo_product_id: combo.id, component_product_id: componentB.id, quantity: 1 },
    ])
    expect(comboItemsErr).toBeNull()

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Combo E2E",
        customerPhone: "41999995003",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem({ ...combo, name: combo.name }, 3)],
        total: combo.price * 3,
      },
    })
    expect(res.ok()).toBeTruthy()

    const { data: products } = await sb.from("products").select("id, stock_quantity").in("id", [componentA.id, componentB.id])
    const byId = new Map((products ?? []).map((p) => [p.id, p.stock_quantity]))
    expect(byId.get(componentA.id)).toBe(20 - 2 * 3)
    expect(byId.get(componentB.id)).toBe(20 - 1 * 3)
  })

  test("combo: componente sem estoque suficiente bloqueia o pedido inteiro, sem baixar nenhum componente", async ({ request }) => {
    const componentA = await createProduct({ stock_quantity: 1 }) // precisa de 2 por combo — insuficiente
    const componentB = await createProduct({ stock_quantity: 20 })
    const combo = await createProduct({ stock_type: "combo", stock_quantity: 0 })

    const sb = adminClient()
    await sb.from("combo_items").insert([
      { combo_product_id: combo.id, component_product_id: componentA.id, quantity: 2 },
      { combo_product_id: combo.id, component_product_id: componentB.id, quantity: 1 },
    ])

    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Combo Insuficiente E2E",
        customerPhone: "41999995004",
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [orderItem({ ...combo, name: combo.name }, 1)],
        total: combo.price,
      },
    })
    expect(res.ok()).toBeFalsy()
    expect(res.status()).toBe(409)

    const { data: products } = await sb.from("products").select("id, stock_quantity").in("id", [componentA.id, componentB.id])
    const byId = new Map((products ?? []).map((p) => [p.id, p.stock_quantity]))
    // Componente B tinha estoque de sobra — mas como A falhou, o rollback
    // precisa desfazer a reserva de B também (atomicidade entre componentes
    // do MESMO combo, não só entre itens diferentes do pedido).
    expect(byId.get(componentA.id)).toBe(1)
    expect(byId.get(componentB.id)).toBe(20)
  })
})
