// Roda uma vez antes de toda a suite — garante que o produto de teste sempre
// comece com estoque farto, já que testes anteriores (ou runs anteriores)
// podem tê-lo esgotado. Testes que precisam de estoque baixo (corrida de
// concorrência) setam o valor baixo eles mesmos, dentro do próprio teste.
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import { loadFixtures } from "./fixtures"

export default async function globalSetup() {
  if (!fs.existsSync("e2e/.fixtures.json")) return

  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      })
  )
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const fx = loadFixtures()
  await sb.from("products").update({ stock_quantity: 100, is_active: true }).eq("id", fx.product.id)
}
