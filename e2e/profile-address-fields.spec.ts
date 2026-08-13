import { test, expect } from "@playwright/test"
import { login } from "./helpers"

test.describe("Perfil — endereço estruturado", () => {
  test("cliente logado salva CEP/bairro/complemento e vê tudo preenchido ao reabrir", async ({ page }) => {
    await login(page)
    // login() já deixa o modal aberto na view "Minha Conta" (sem intent de
    // checkout, handleLogin não fecha o modal) — clicar em "Perfil" de novo
    // aqui seria redundante e ambíguo (o botão "Editar Perfil" também bate
    // com o nome "Perfil" em match parcial), então vai direto no menu.
    await page.getByRole("button", { name: /editar perfil/i }).click()

    await page.getByPlaceholder("00000-000").fill("80010-000") // Rua José Loureiro, Centro, Curitiba
    await expect(page.getByLabel("Bairro")).toHaveValue("Centro", { timeout: 8000 })
    await page.getByPlaceholder("Apto, bloco, casa").fill("Sala 5")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    // A mensagem "Perfil atualizado!" é rápida (~1.5s) e já volta sozinha pra
    // tela "Minha Conta" — mesma flakiness documentada em storefront-auth.spec.ts.
    // Checar o retorno à tela de conta é mais confiável que pegar o toast.
    await expect(page.getByRole("heading", { name: "Minha Conta" })).toBeVisible({ timeout: 8000 })

    await page.reload()
    await page.getByRole("button", { name: "Perfil" }).click()
    await page.getByRole("button", { name: /editar perfil/i }).click()
    await expect(page.getByLabel("Bairro")).toHaveValue("Centro")
    await expect(page.getByPlaceholder("Apto, bloco, casa")).toHaveValue("Sala 5")
  })

  test("endereço bloqueado desabilita o botão Salvar alterações", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: /editar perfil/i }).click()

    await page.getByPlaceholder("00000-000").fill("83601-000") // Rua Centenário, Centro, Campo Largo/PR
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
  })
})
