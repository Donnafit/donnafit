import { test, expect } from "@playwright/test"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()

test.beforeAll(async () => {
  await resetProductStock(fx.product.id, 100)
})

function deliveryItem() {
  return {
    product: {
      id: fx.product.id,
      name: fx.product.name,
      sku: `E2E-TEST-${fx.runTag}`,
      price: fx.product.price,
      stock_type: "avulso",
      category_id: null,
    },
    quantity: 8, // MIN_DELIVERY_ITEMS
  }
}

test.describe("/api/orders — bloqueio de cidade e bairro explícito", () => {
  test("recusa pedido com deliveryCityCheck = Campo Largo", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990010",
        deliveryType: "delivery",
        address: "Rua das Palmeiras, 100",
        deliveryAddress: "Rua das Palmeiras, 100",
        deliveryCityCheck: "Campo Largo",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Ainda não entregamos em sua região")
  })

  test("recusa pedido quando o próprio endereço contém o nome da cidade bloqueada, mesmo sem deliveryCityCheck", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990011",
        deliveryType: "delivery",
        address: "Rua Principal, 50, Araucária",
        deliveryAddress: "Rua Principal, 50, Araucária",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Ainda não entregamos em sua região")
  })

  test("aceita deliveryBairro explícito e usa a taxa da zona, sem depender do texto do endereço", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990012",
        deliveryType: "delivery",
        address: "Endereço sem nome de bairro reconhecível, 999",
        deliveryAddress: "Endereço sem nome de bairro reconhecível, 999",
        deliveryBairro: "Centro",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.deliveryFee).toBeGreaterThan(0)
  })

  test("deliveryBairro de zona inativa/inexistente cai no pipeline de texto de hoje, não rejeita o pedido", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990013",
        deliveryType: "delivery",
        address: "Rua XV de Novembro, 100, Centro",
        deliveryAddress: "Rua XV de Novembro, 100, Centro",
        deliveryBairro: "Bairro Que Não Existe",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.deliveryFee).toBeGreaterThan(0)
  })
})
