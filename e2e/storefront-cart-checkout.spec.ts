import { test, expect } from "@playwright/test"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()

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

function cartDrawer(page: import("@playwright/test").Page) {
  return page.getByTestId("cart-drawer")
}

async function openCartWithItemReady(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Carrinho" }).first().click()
  await expect(page.getByText("Meu Carrinho")).toBeVisible()
  // aguarda o item real aparecer (hidratação do drawer troca de vazio -> conteúdo).
  // Escopado ao drawer — "Remover um" também existe na página de produto atrás dele.
  await expect(cartDrawer(page).getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
}

test.describe("Cardápio — carrinho e checkout (produto de teste)", () => {
  test("adiciona produto ao carrinho pela página de detalhe, mostra confirmação e reflete no drawer", async ({ page }) => {
    await page.goto(`/produto/${fx.product.id}`)
    await expect(page.getByRole("heading", { name: fx.product.name })).toBeVisible()
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    // Comportamento correto: mostra "Adicionado!" antes de virar o stepper de quantidade.
    await expect(page.getByText(/adicionado!/i)).toBeVisible({ timeout: 2000 })

    await openCartWithItemReady(page)
  })

  test("stepper no carrinho remove o item ao chegar em zero", async ({ page }) => {
    await page.goto(`/produto/${fx.product.id}`)
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    await openCartWithItemReady(page)

    await cartDrawer(page).getByRole("button", { name: "Remover um" }).click()
    // texto real é "Seu carrinho está vazio" — "está" no meio quebra um match literal de "carrinho vazio"
    await expect(page.getByText(/carrinho.*vazio|nenhum item/i)).toBeVisible()
  })

  test("fluxo completo de checkout (logado, retirada, PIX) cria pedido real e chega na confirmação", async ({ page, context }) => {
    await login(page)

    await page.goto(`/produto/${fx.product.id}`)
    await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
    await openCartWithItemReady(page)

    await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()

    await expect(page).toHaveURL(/\/checkout/)
    await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Teste E2E")
    await page.getByPlaceholder("(41) 99999-9999").fill("41999998888")
    // name começando com — "Retirada" sozinho bate por substring também em
    // "Maquininha Na entrega/retirada"
    await page.getByRole("button", { name: /^Retirada/ }).click()
    await page.getByRole("button", { name: /^PIX/ }).click()

    const submit = page.getByRole("button", { name: /confirmar e abrir whatsapp/i })
    await expect(submit).toBeEnabled()

    const [popup] = await Promise.all([
      context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
      submit.click(),
    ])
    if (popup) await popup.close()

    await expect(page).toHaveURL(/\/confirmacao/, { timeout: 15_000 })
    await expect(page.getByText(/pedido confirmado/i)).toBeVisible()
  })
})
