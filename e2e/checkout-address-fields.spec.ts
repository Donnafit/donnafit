import { test, expect } from "@playwright/test"
import { loadFixtures, resetProductStock } from "./fixtures"
import { addToCartAndGoToCheckout } from "./helpers"

const fx = loadFixtures()

test.beforeAll(async () => {
  await resetProductStock(fx.product.id, 100)
})

test.describe("Checkout — campos de endereço estruturado", () => {
  test("CEP autopreenche endereço e pré-seleciona o bairro quando existe zona cadastrada", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("00000-000").fill("80010-000") // Rua José Loureiro, Centro, Curitiba
    await expect(page.getByLabel("Bairro")).toHaveValue("Centro", { timeout: 8000 })
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible()
  })

  test("bairro fora da lista usa o fallback de zona mais próxima com aviso de estimativa", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Euclides da Cunha, 1235")
    await page.getByLabel("Bairro").selectOption({ label: "Meu bairro não está na lista" })
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
    await page.getByLabel("Bairro").selectOption({ label: "Meu bairro não está na lista" })
    await page.getByPlaceholder("Digite o nome do seu bairro").fill("Centro, Araucária")
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })
  })
})
