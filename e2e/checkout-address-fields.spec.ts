import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures, resetProductStock, clearCustomerDeliveryMetadata } from "./fixtures"
import { addToCartAndGoToCheckout, selectBairro } from "./helpers"

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
  await resetProductStock(fx.product.id, 100)
})

// O checkout autopreenche o endereço salvo no perfil do cliente logado — e o
// cliente de teste é compartilhado com outros specs (o de perfil grava
// endereço nele). Cada teste aqui parte de endereço vazio pra medir o que ele
// diz medir (CEP, bairro, bloqueio) e não o que sobrou de outro spec.
test.beforeEach(async () => {
  await clearCustomerDeliveryMetadata(fx.customer.id)
})

// O último teste fecha um pedido de entrega, o que salva o endereço no perfil
// do cliente de teste — limpa pra não vazar pros outros arquivos.
test.afterAll(async () => {
  await clearCustomerDeliveryMetadata(fx.customer.id)
})

test.describe("Checkout — campos de endereço estruturado", () => {
  test("CEP autopreenche endereço e pré-seleciona o bairro quando existe zona cadastrada", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("00000-000").fill("80010-000") // Rua José Loureiro, Centro, Curitiba
    await expect(page.getByLabel("Bairro")).toHaveText("Centro", { timeout: 8000 })
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible()
  })

  test("bairro fora da lista usa o fallback de zona mais próxima com aviso de estimativa", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Euclides da Cunha, 1235")
    await selectBairro(page, "Meu bairro não está na lista")
    // "Vargem Grande" sozinho (sem ", Pinhais") — o texto não pode conter o
    // nome de nenhuma zona cadastrada por substring (ex: "Pinhais" já é uma
    // zona ativa), senão o match local (matchDeliveryZone) resolve na hora e
    // o fallback de geocoding/zona mais próxima nunca é exercitado.
    // Verificado ao vivo: geocodifica pra Vargem Grande/Pinhais (suburb sem
    // zona cadastrada com esse nome) e cai na zona mais próxima cadastrada.
    await page.getByPlaceholder("Digite o nome do seu bairro").fill("Vargem Grande")
    await expect(page.getByText(/frete estimado pela zona mais próxima/i)).toBeVisible({ timeout: 8000 })
  })

  test("CEP de cidade bloqueada mostra a mensagem e desabilita o pedido", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("00000-000").fill("83601-000") // Rua Centenário, Centro, Campo Largo/PR
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole("button", { name: /confirmar e abrir whatsapp/i })).toBeDisabled()
  })

  test("bairro digitado manualmente contendo cidade bloqueada também recusa", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Principal, 50")
    await selectBairro(page, "Meu bairro não está na lista")
    await page.getByPlaceholder("Digite o nome do seu bairro").fill("Centro, Araucária")
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })
  })

  test("apagar o CEP de cidade bloqueada libera o pedido de novo (bloqueio não fica preso)", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Marechal Deodoro, 630")
    await page.getByPlaceholder("00000-000").fill("83601-000") // Campo Largo/PR
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })

    // Cliente desiste do CEP e vai preencher o endereço na mão. Como o bairro
    // não muda, os outros dois efeitos não re-rodam — só o efeito do CEP pode
    // limpar o bloqueio, senão o checkout ficava travado pra sempre.
    await page.getByPlaceholder("00000-000").fill("")
    await expect(page.getByText("Ainda não entregamos em sua região")).toHaveCount(0, { timeout: 8000 })
    await selectBairro(page, "Centro")
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole("button", { name: /confirmar e abrir whatsapp/i })).toBeEnabled()
  })

  test("endereço curto demais explica o motivo em vez de só desabilitar o botão", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua X")
    await expect(page.getByText(/informe o endereço completo/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /confirmar e abrir whatsapp/i })).toBeDisabled()

    await page.getByPlaceholder("Rua, número").fill("Rua Marechal Deodoro, 630")
    await expect(page.getByText(/informe o endereço completo/i)).toHaveCount(0)
  })

  test("complemento digitado enquanto o CEP ainda está sendo consultado não é desfeito", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    // Digita o CEP e, dentro da janela de debounce + rede do ViaCEP, segue
    // preenchendo o complemento. A resolução do CEP tem que mesclar no valor
    // ATUAL — antes ela espalhava o estado capturado no início do efeito e
    // apagava o que o cliente digitou nesse meio-tempo.
    await page.getByPlaceholder("00000-000").fill("80010-000")
    await page.getByPlaceholder("Apto, bloco, casa").fill("Apto 42")

    await expect(page.getByLabel("Bairro")).toHaveText("Centro", { timeout: 8000 })
    await expect(page.getByPlaceholder("Apto, bloco, casa")).toHaveValue("Apto 42")
  })
})

test.describe("Checkout — endereço salvo no pedido", () => {
  test("endereço gravado no pedido inclui bairro, complemento e CEP (navegação do entregador)", async ({ page, context }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Seu nome e sobrenome").fill(`[E2E_TEST] Endereco ${fx.runTag}`)
    await page.getByPlaceholder("00000-000").fill("80010-000") // Centro, Curitiba
    await expect(page.getByLabel("Bairro")).toHaveText("Centro", { timeout: 8000 })
    // Só completa o número DEPOIS que o ViaCEP já preencheu a rua — a
    // resolução do CEP sobrescreve o campo de rua com o nome vindo da consulta
    // (sem número), então digitar antes seria desfeito.
    await expect(page.getByPlaceholder("Rua, número")).toHaveValue(/José Loureiro/, { timeout: 8000 })
    await page.getByPlaceholder("Rua, número").fill("Rua José Loureiro, 500")
    await page.getByPlaceholder("Apto, bloco, casa").fill("Apto 42")
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible({ timeout: 8000 })

    const submit = page.getByRole("button", { name: /confirmar e abrir whatsapp/i })
    await expect(submit).toBeEnabled()
    const [popup] = await Promise.all([
      context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
      submit.click(),
    ])
    if (popup) await popup.close()
    await expect(page).toHaveURL(/\/confirmacao/, { timeout: 20_000 })

    const orderNumber = new URL(page.url()).searchParams.get("order")
    expect(orderNumber).toBeTruthy()
    const { data: order } = await adminClient()
      .from("orders")
      .select("delivery_address")
      .eq("order_number", orderNumber)
      .single()
    // `orders.delivery_address` é a única cópia do endereço que sobra pro
    // entregador/WhatsApp/admin — sem bairro, o link do Maps volta a ser
    // ambíguo, que é justamente o que esse fluxo veio resolver.
    expect(order?.delivery_address).toContain("Rua José Loureiro, 500")
    expect(order?.delivery_address).toContain("Centro")
    expect(order?.delivery_address).toContain("Apto 42")
    expect(order?.delivery_address).toContain("CEP 80010-000")
  })

  test("cliente logado com endereço já salvo (com número) reabre o checkout e o número continua lá", async ({ page }) => {
    // Cliente relatou 14/08/2026: CEP autopreenche rua/bairro certinho, mas
    // se o número já foi salvo numa visita anterior, reabrir o perfil OU um
    // novo pedido "puxa a rua sem o número" — o efeito do CEP rodava de novo
    // pro CEP JÁ salvo (não digitado agora) e sobrescrevia a rua pela versão
    // crua do ViaCEP. Diferente do teste anterior (CEP digitado na hora),
    // este simula a volta do cliente: grava o endereço direto no
    // user_metadata (como já ficaria salvo de um pedido anterior) e só
    // confere que o checkout carrega e MANTÉM o número, sem digitar CEP.
    await adminClient().auth.admin.updateUserById(fx.customer.id, {
      user_metadata: {
        delivery_cep: "80010-000",
        delivery_street: "Rua José Loureiro, 500",
        delivery_bairro: "Centro",
        delivery_complement: "Apto 42",
      },
    })

    await addToCartAndGoToCheckout(page)

    // Várias amostras ao longo de alguns segundos — o bug original só
    // aparecia um instante DEPOIS do carregamento (efeito assíncrono),
    // então checar só uma vez logo após o load não pegaria a regressão.
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(400)
      await expect(page.getByPlaceholder("Rua, número")).toHaveValue("Rua José Loureiro, 500")
    }
    await expect(page.getByLabel("Bairro")).toHaveText("Centro")
    await expect(page.getByPlaceholder("Apto, bloco, casa")).toHaveValue("Apto 42")
  })
})
