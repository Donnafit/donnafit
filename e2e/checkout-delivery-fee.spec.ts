import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures, resetProductStock, clearCustomerDeliveryMetadata } from "./fixtures"
import { login, addToCartAndGoToCheckout, selectBairro } from "./helpers"

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
  // Endereço salvo no perfil do cliente de teste (gravado por outro spec)
  // autopreencheria rua/bairro no checkout e mascararia o caso "sem bairro
  // selecionado" abaixo — depende só da ordem dos arquivos, então limpa.
  await clearCustomerDeliveryMetadata(fx.customer.id)
})

test.describe("Cardápio — frete reconhecido pelo bairro selecionado (select de bairro cadastrado)", () => {
  test("existe select de bairro — campo de endereço livre (sem bairro) + complemento opcional em campo separado", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await expect(page.getByLabel("Bairro")).toBeVisible()
    await expect(page.getByPlaceholder("Rua, número")).toBeVisible()
    await expect(page.getByPlaceholder(/apto, bloco, casa/i)).toBeVisible()
  })

  test("bairro selecionado na lista calcula o frete automaticamente e habilita o envio", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Presidente Faria, 100")
    await selectBairro(page, "Batel")

    await expect(page.getByText(/bairro identificado: batel/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/frete r\$\s?12,00/i)).toBeVisible()
    // Resumo do pedido reflete o mesmo frete.
    await expect(page.getByText("Frete", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /confirmar e abrir whatsapp/i })).toBeEnabled()
  })

  test("sem bairro selecionado bloqueia o envio e orienta o cliente", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Inventada Sem Bairro Nenhum, 42")

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
          quantity: 8,
        }],
        total: fx.product.price * 8,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    expect(body.orderId).toBeTruthy()

    const { data: order } = await adminClient().from("orders").select("total").eq("id", body.orderId).single()
    // Comportamento correto: total = preço do produto + taxa REAL do Batel (R$12),
    // nunca o frete forjado de R$999 enviado pelo cliente.
    expect(Number(order?.total)).toBeCloseTo(fx.product.price * 8 + 12, 2)
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
          quantity: 8,
        }],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/não foi possível identificar o bairro/i)
  })
})

test.describe("Complemento não deve atrapalhar o reconhecimento do bairro", () => {
  test("bairro selecionado na lista, com complemento 'Sala X' no campo separado, mantém o frete correto", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Marechal Deodoro, 630")
    await selectBairro(page, "Centro")
    await page.getByPlaceholder(/apto, bloco, casa/i).fill("Sala 12")

    // O campo de complemento é um estado totalmente separado do de bairro —
    // nunca é lido pela resolução de zona (nem pelo select, nem pelo
    // fallback de geocoding), então preenchê-lo não deveria mudar o bairro
    // nem o frete já identificados.
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/frete r\$\s?10,00/i)).toBeVisible()
  })

  test("bairro digitado manualmente (fallback 'não está na lista'), com complemento 'apto 302' no campo separado, geocodifica corretamente", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Padre Anchieta, 2000")
    await selectBairro(page, "Meu bairro não está na lista")
    await page.getByPlaceholder("Digite o nome do seu bairro").fill("Rua Padre Anchieta, 2000")
    await page.getByPlaceholder(/apto, bloco, casa/i).fill("apto 302")

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
    await expect(page.getByText(/bairro sem zona própria cadastrada|bairro identificado: (campina do siqueira|bigorrilho)/i)).toBeVisible({ timeout: 8000 })
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
          quantity: 8,
        }],
        total: fx.product.price * 8,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    const { data: order } = await adminClient().from("orders").select("total").eq("id", body.orderId).single()
    // Frete real do Centro (R$ 10) — só é possível se o servidor conseguiu
    // geocodificar o endereço com o complemento removido.
    expect(Number(order?.total)).toBeCloseTo(fx.product.price * 8 + 10, 2)
  })

  test("complemento com texto livre (ponto de referência) não deve quebrar o geocoding do bairro (regressão)", async ({ request }) => {
    // Bug relatado: cliente digitava um ponto de referência livre no campo de
    // complemento (ex: "perto do mercado, portão azul") — texto que não bate
    // em nenhuma das palavras-chave de stripAddressComplement (apto/bloco/
    // casa/etc) e por isso ia inteiro, sem filtro, pra dentro da query do
    // Nominatim junto com o endereço. Confirmado ao vivo: a mesma rua/número
    // que geocodifica certo sozinha retorna ZERO resultados do Nominatim
    // assim que esse texto solto é anexado — o serviço trata a frase como
    // parte do endereço e não encontra nada. Resultado: o checkout mostrava
    // "Bairro identificado" (o geocoding do CLIENTE roda só sobre o campo de
    // endereço, sem o complemento) mas o POST /api/orders falhava com "não
    // foi possível identificar o bairro", porque geocodeToBairro rodava sobre
    // o endereço JÁ concatenado com esse texto livre do complemento.
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Complemento Livre E2E",
        customerPhone: "41999992222",
        deliveryType: "delivery",
        address: "Rua Marechal Deodoro, 630",
        deliveryAddress: "Rua Marechal Deodoro, 630 - perto do mercado, portão azul",
        paymentMethod: "card",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 8,
        }],
        total: fx.product.price * 8,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    const { data: order } = await adminClient().from("orders").select("total, delivery_address").eq("id", body.orderId).single()
    // Frete real do Centro (R$ 10) — só é possível se o servidor identificou
    // o bairro a partir do endereço puro, ignorando o texto livre do complemento.
    expect(Number(order?.total)).toBeCloseTo(fx.product.price * 8 + 10, 2)
    // O endereço completo (com o complemento) continua salvo no pedido.
    expect(order?.delivery_address).toContain("perto do mercado")
  })

  test("bairro escrito DEPOIS do complemento também é resolvido (regressão)", async ({ request }) => {
    // stripAddressComplement cortava tudo que vinha depois da palavra-chave
    // de complemento — quando o bairro aparecia depois do "apto"/"bloco"/etc
    // (em vez de antes), ele era perdido junto e o pedido falhava com "não
    // foi possível identificar o bairro" mesmo o cliente tendo digitado certo.
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Complemento Antes do Bairro E2E",
        customerPhone: "41999993333",
        deliveryType: "delivery",
        deliveryAddress: "Rua das Flores, 100, Apto 12, Batel",
        paymentMethod: "card",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 8,
        }],
        total: fx.product.price * 8,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    const { data: order } = await adminClient().from("orders").select("total").eq("id", body.orderId).single()
    expect(Number(order?.total)).toBeCloseTo(fx.product.price * 8 + 12, 2)
  })
})
