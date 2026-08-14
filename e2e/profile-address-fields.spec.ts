import { test, expect } from "@playwright/test"
import { login } from "./helpers"
import { loadFixtures, clearCustomerDeliveryMetadata } from "./fixtures"

const fx = loadFixtures()

// Este spec grava endereço no perfil do cliente de teste, que é compartilhado
// com os specs de checkout (lá o endereço salvo é autopreenchido). Limpar no
// fim mantém os outros arquivos independentes da ordem de execução.
test.afterAll(async () => {
  await clearCustomerDeliveryMetadata(fx.customer.id)
})

test.describe("Perfil — endereço estruturado", () => {
  test("cliente logado salva CEP/bairro/complemento e vê tudo preenchido ao reabrir", async ({ page }) => {
    await login(page)
    // login() já deixa o modal aberto na view "Minha Conta" (sem intent de
    // checkout, handleLogin não fecha o modal) — clicar em "Perfil" de novo
    // aqui seria redundante e ambíguo (o botão "Editar Perfil" também bate
    // com o nome "Perfil" em match parcial), então vai direto no menu.
    await page.getByRole("button", { name: /editar perfil/i }).click()

    await page.getByPlaceholder("00000-000").fill("80010-000") // Rua José Loureiro, Centro, Curitiba
    await expect(page.getByLabel("Bairro")).toHaveText("Centro", { timeout: 8000 })
    // O CEP autopreenche a rua SEM número (é só o que o ViaCEP devolve) — o
    // cliente sempre completa à mão. Cliente relatou 14/08/2026: ao reabrir
    // o perfil (ou um novo pedido), o número sumia — o efeito do CEP rodava
    // de novo pro mesmo CEP já salvo e sobrescrevia a rua pela versão crua
    // do ViaCEP. Esse teste cobre exatamente esse número sobrevivendo ao
    // reload, não só o bairro/complemento que já cobria antes.
    await expect(page.getByPlaceholder("Rua, número")).toHaveValue(/José Loureiro/, { timeout: 8000 })
    await page.getByPlaceholder("Rua, número").fill("Rua José Loureiro, 500")
    await page.getByPlaceholder("Apto, bloco, casa").fill("Sala 5")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    // A mensagem "Perfil atualizado!" é rápida (~1.5s) e já volta sozinha pra
    // tela "Minha Conta" — mesma flakiness documentada em storefront-auth.spec.ts.
    // Checar o retorno à tela de conta é mais confiável que pegar o toast.
    await expect(page.getByRole("heading", { name: "Minha Conta" })).toBeVisible({ timeout: 8000 })

    // Nota: o site tem um bug de hidratação pré-existente e não relacionado
    // a este fix (afeta várias páginas, não só o perfil — confirmado
    // revertendo as mudanças de hoje e reproduzindo o mesmo erro em
    // qualquer página) que deixa este page.reload() ocasionalmente flaky.
    // Corrigido de verdade e confirmado ao vivo no navegador (várias
    // amostras ao longo do tempo, checkout e perfil); investigar aquele
    // bug de hidratação é trabalho separado.
    await page.reload()
    await page.getByRole("button", { name: "Perfil" }).click()
    await page.getByRole("button", { name: /editar perfil/i }).click()
    // Várias amostras ao longo de alguns segundos — o bug original só
    // aparecia um instante DEPOIS do carregamento (efeito assíncrono do
    // CEP), então checar só uma vez não pegaria a regressão.
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(400)
      await expect(page.getByPlaceholder("Rua, número")).toHaveValue("Rua José Loureiro, 500")
    }
    await expect(page.getByLabel("Bairro")).toHaveText("Centro")
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
