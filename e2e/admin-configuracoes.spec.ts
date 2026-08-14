import { test, expect } from "@playwright/test"
import { loadFixtures, serviceClient } from "./fixtures"

const fx = loadFixtures()

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  await page.goto("/admin/configuracoes")
}

test.describe("Admin — Configurações", () => {
  test("salvar alterações persiste de verdade após recarregar a página", async ({ page }) => {
    await loginAdmin(page)

    const storeNameInput = page.getByLabel("Nome do restaurante").or(page.locator('input').first())
    const uniqueName = `Donna FIT Teste ${fx.runTag}`
    await storeNameInput.fill(uniqueName)
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()

    await page.reload()
    // Comportamento correto: valor sobrevive ao reload (antes, tudo voltava ao padrão "Donna FIT").
    await expect(page.locator('input').first()).toHaveValue(uniqueName)
  })

  test("toggle de som responde ao clique (antes não tinha handler nenhum)", async ({ page }) => {
    await loginAdmin(page)
    const toggle = page.getByRole("switch", { name: /som ao receber pedido/i })
    const before = await toggle.getAttribute("aria-checked")
    await toggle.click()
    const after = await toggle.getAttribute("aria-checked")
    expect(after).not.toBe(before)
  })

  test("desconto PIX é editável e persiste após recarregar", async ({ page }) => {
    await loginAdmin(page)
    const pixInput = page.locator('input[type="number"]').first()
    await expect(pixInput).toBeVisible()

    await pixInput.fill("3")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()

    await page.reload()
    await expect(page.locator('input[type="number"]').first()).toHaveValue("3")

    // restaura pra não deixar a taxa real do restaurante alterada pelo teste
    await page.locator('input[type="number"]').first().fill("2")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()
  })

  test("gestão de taxas por bairro mora em Configurações (não mais em Rota de Entrega)", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /gerenciar taxas por bairro/i }).click()
    await expect(page.getByText("Taxas de entrega por bairro")).toBeVisible()
    await expect(page.getByText(/bairros cadastrados/i)).toBeVisible()

    const modal = page.getByTestId("delivery-zones-modal")
    await modal.getByPlaceholder(/buscar bairro/i).fill("Batel")
    const feeInput = modal.locator('input[type="number"]').first()
    await expect(feeInput).toHaveValue("12")

    await page.getByRole("button", { name: "Fechar" }).click()
    await expect(page.getByText("Taxas de entrega por bairro")).not.toBeVisible()

    // Negativo: não deve mais existir em Rota de Entrega.
    await page.goto("/admin/rota-entrega")
    await expect(page.getByRole("button", { name: /taxas por bairro/i })).not.toBeVisible()
  })

  test("horário personalizado por dia (sábado reduzido, domingo fechado) persiste e reflete no rodapé público", async ({ page }) => {
    await loginAdmin(page)

    const sabRow = page.getByTestId("weekly-hours-row-sab")
    await sabRow.getByRole("button", { name: "Personalizado" }).click()
    await sabRow.locator("select").first().selectOption("10")
    await sabRow.locator("select").nth(1).selectOption("14")

    const domRow = page.getByTestId("weekly-hours-row-dom")
    await domRow.getByRole("button", { name: "Fechado" }).click()

    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()

    // Sobrevive ao reload (mesma garantia que os outros campos desta página já têm).
    // Os selects só aparecem em modo "Personalizado" — se o reload tivesse voltado
    // pro padrão, esta linha nem teria select nenhum.
    await page.reload()
    await expect(sabRow.locator("select").first()).toHaveValue("10")
    await expect(sabRow.locator("select").nth(1)).toHaveValue("14")
    // Domingo fechado não deve ter select nenhum (não é modo "custom")
    await expect(domRow.locator("select")).toHaveCount(0)

    // Reflete no rodapé do cardápio público, sem precisar de login
    await page.goto("/")
    const footer = page.locator("footer")
    await expect(footer.getByText(/sáb.*10h às 14h/i)).toBeVisible()
    await expect(footer.getByText(/dom.*fechado/i)).toBeVisible()

    // Restaura pra não deixar o horário real do restaurante alterado pelo teste
    await page.goto("/admin/configuracoes")
    await sabRow.getByRole("button", { name: "Padrão" }).click()
    await domRow.getByRole("button", { name: "Padrão" }).click()
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Salvo!")).toBeVisible()
  })
})

test.describe("Rodapé público — sincronizado com o perfil da cozinha", () => {
  test("telefone e endereço do rodapé batem com store_settings, não texto fixo", async ({ page }) => {
    const { data } = await serviceClient()
      .from("store_settings")
      .select("whatsapp, pickup_address")
      .eq("id", "default")
      .single()

    await page.goto("/")
    const footer = page.locator("footer")
    if (data?.pickup_address) {
      await expect(footer.getByText(data.pickup_address)).toBeVisible()
    }
    if (data?.whatsapp) {
      await expect(footer.getByText(data.whatsapp)).toBeVisible()
    }
  })
})
