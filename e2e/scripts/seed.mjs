// Cria dados de teste isolados (prefixo E2E_TEST) direto no banco de produção,
// usando a service role key — autorizado explicitamente pelo usuário para esta sessão.
// Roda ANTES da suite E2E. O contraponto é e2e/scripts/cleanup.mjs, que apaga tudo
// que este script cria (IDs salvos em e2e/.fixtures.json).
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runTag = Date.now().toString(36)
const customerEmail = `e2e-test-customer-${runTag}@donnafit-test.invalid`
const adminEmail = `e2e-test-admin-${runTag}@donnafit-test.invalid`
const password = "E2eTest!2026"

async function main() {
  // Produto de teste — nome claramente marcado, preço baixo, estoque avulso
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({
      name: "[E2E_TEST] Marmita de Teste — não remover manualmente",
      sku: `E2E-TEST-${runTag}`,
      price: 1,
      stock_type: "individual",
      stock_quantity: 25,
      min_stock_alert: 5,
      is_active: true,
      description: "Produto criado automaticamente para teste E2E. Seguro de remover via cleanup.mjs.",
      sort_order: 9999,
    })
    .select()
    .single()
  if (prodErr) throw new Error("Falha ao criar produto de teste: " + prodErr.message)

  // Cliente de teste
  const { data: customer, error: custErr } = await supabase.auth.admin.createUser({
    email: customerEmail,
    password,
    email_confirm: true,
    user_metadata: { name: "Cliente Teste E2E" },
  })
  if (custErr) throw new Error("Falha ao criar cliente de teste: " + custErr.message)

  // Admin de teste
  const { data: admin, error: adminErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: { name: "Admin Teste E2E" },
  })
  if (adminErr) throw new Error("Falha ao criar admin de teste: " + adminErr.message)

  // Garante role=admin no profile (trigger provavelmente já criou a linha com role padrão)
  const { error: roleErr } = await supabase
    .from("profiles")
    .upsert({ id: admin.user.id, role: "admin", full_name: "Admin Teste E2E" })
  if (roleErr) throw new Error("Falha ao definir role admin: " + roleErr.message)

  const fixtures = {
    runTag,
    product: { id: product.id, name: product.name, price: product.price },
    customer: { id: customer.user.id, email: customerEmail, password },
    admin: { id: admin.user.id, email: adminEmail, password },
  }
  fs.writeFileSync("e2e/.fixtures.json", JSON.stringify(fixtures, null, 2))
  console.log("Fixtures criadas:")
  console.log(JSON.stringify(fixtures, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
