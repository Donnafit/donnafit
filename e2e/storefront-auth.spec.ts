import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()
const registerEmail = `e2e-test-register-${fx.runTag}@donnafit-test.invalid`

function adminClient() {
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
  )
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

test.afterAll(async () => {
  const sb = adminClient()
  const { data } = await sb.auth.admin.listUsers()
  const created = data.users.find((u) => u.email === registerEmail)
  if (created) await sb.auth.admin.deleteUser(created.id)
})

async function openProfileModal(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Perfil" }).click()
}

test.describe("Cardápio — autenticação do cliente", () => {
  test("cadastro com campos vazios mostra erro sem chamar a API", async ({ page }) => {
    await openProfileModal(page)
    await page.getByRole("button", { name: "Cadastrar", exact: true }).click()
    await page.locator("form").getByRole("button", { name: "Criar conta" }).click()
    await expect(page.getByText("Preencha todos os campos.")).toBeVisible()
  })

  test("cadastro com senha curta é bloqueado", async ({ page }) => {
    await openProfileModal(page)
    await page.getByRole("button", { name: "Cadastrar", exact: true }).click()
    await page.getByPlaceholder("Maria da Silva").fill("Cliente Teste")
    await page.getByPlaceholder("(11) 99999-9999").fill("11999998888")
    await page.getByPlaceholder("seu@email.com").fill(`e2e-weak-${fx.runTag}@donnafit-test.invalid`)
    await page.getByPlaceholder("Mínimo 6 caracteres").fill("123")
    await page.locator("form").getByRole("button", { name: "Criar conta" }).click()
    await expect(page.getByText("Senha deve ter no mínimo 6 caracteres.")).toBeVisible()
  })

  test("cadastro válido cria a conta (login automático ou confirmação por e-mail)", async ({ page }) => {
    await openProfileModal(page)
    await page.getByRole("button", { name: "Cadastrar", exact: true }).click()
    await page.getByPlaceholder("Maria da Silva").fill("Cliente Registrado E2E")
    await page.getByPlaceholder("(11) 99999-9999").fill("11999997777")
    await page.getByPlaceholder("seu@email.com").fill(registerEmail)
    await page.getByPlaceholder("Mínimo 6 caracteres").fill("SenhaForte123")
    await page.locator("form").getByRole("button", { name: "Criar conta" }).click()

    await expect(
      page.getByText(/cadastro realizado/i).or(page.getByText("Minha Conta"))
    ).toBeVisible({ timeout: 10_000 })
  })

  test("login com senha errada mostra mensagem genérica", async ({ page }) => {
    await openProfileModal(page)
    await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
    await page.getByPlaceholder("••••••••").fill("senha-errada-qualquer")
    await page.locator("form").getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible()
  })

  test("esqueci minha senha sempre mostra 'E-mail enviado' — mesmo pra e-mail inexistente", async ({ page }) => {
    await openProfileModal(page)
    await page.getByText("Esqueci minha senha").click()
    await page.getByPlaceholder("seu@email.com").fill("nao-existe-nenhuma-conta-com-esse-email@donnafit-test.invalid")
    await page.locator("form").getByRole("button", { name: /enviar link de recuperação/i }).click()
    await expect(page.getByText("E-mail enviado!")).toBeVisible({ timeout: 8000 })
  })

  test("editar perfil salva o novo nome de verdade", async ({ page }) => {
    await openProfileModal(page)
    await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
    await page.getByPlaceholder("••••••••").fill(fx.customer.password)
    await page.locator("form").getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByText("Minha Conta")).toBeVisible({ timeout: 8000 })

    await page.getByText("Editar Perfil").click()
    const newName = `Cliente Editado ${fx.runTag}`
    await page.getByPlaceholder("Seu nome completo").fill(newName)
    await page.locator("form").getByRole("button", { name: "Salvar alterações" }).click()
    // a mensagem "Perfil atualizado!" é rápida (~1.5s) e já volta sozinha pra
    // tela de conta — checar o nome novo lá é mais confiável que pegar o toast.
    await expect(page.getByText(newName)).toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data } = await sb.auth.admin.getUserById(fx.customer.id)
    expect(data.user?.user_metadata?.name).toBe(newName)
  })
})
