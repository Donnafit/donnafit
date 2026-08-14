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

  test("não usa o texto do endereço pra bloquear cidade — sem deliveryCityCheck o pedido segue o pipeline normal", async ({ request }) => {
    // O servidor não inspeciona mais a rua digitada em busca de nome de cidade
    // bloqueada: rua tem nome de cidade com frequência e isso recusava cliente
    // legítimo. Aqui o endereço nem tem bairro reconhecível, então o pedido
    // segue o pipeline normal de zona (geocoding/zona mais próxima) — o que
    // importa é NÃO ser recusado com a mensagem de cidade bloqueada.
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
    const body = await res.json()
    // Este endereço específico não tem bairro atendido, então ele pode acabar
    // recusado pelo pipeline de zona — o que NÃO pode mais acontecer é ser
    // recusado por conter o nome de uma cidade bloqueada no texto da rua.
    // (O caso positivo, endereço com nome de cidade + bairro atendido, está no
    // teste "Rua Araucária" logo abaixo, que exige 200.)
    expect(JSON.stringify(body)).not.toContain("Ainda não entregamos em sua região")
  })

  test("rua legitimamente chamada 'Rua Araucária' não é confundida com a cidade bloqueada", async ({ request }) => {
    // Falso positivo real que esse fix fecha: existe Rua Araucária em bairro
    // comum de Curitiba (aqui com o bairro Centro explícito, atendido), e o
    // cliente tinha o pedido inteiro recusado por causa do nome da rua.
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990014",
        deliveryType: "delivery",
        address: "Rua Araucária, 100",
        deliveryAddress: "Rua Araucária, 100",
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
