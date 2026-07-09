import fs from "fs"
import { createClient } from "@supabase/supabase-js"

export function loadFixtures() {
  const raw = fs.readFileSync("e2e/.fixtures.json", "utf8")
  return JSON.parse(raw) as {
    runTag: string
    product: { id: string; name: string; price: number }
    customer: { id: string; email: string; password: string }
    admin: { id: string; email: string; password: string }
  }
}

// Outros specs (ex: api-orders-integrity) reduzem de propósito o estoque do
// produto de teste pra simular corrida/esgotamento. Cada spec que precisa que
// o produto esteja comprável deve chamar isso no seu beforeAll pra não
// depender da ordem em que os arquivos de teste rodam.
export async function resetProductStock(productId: string, quantity = 100) {
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
  await sb.from("products").update({ stock_quantity: quantity, is_active: true }).eq("id", productId)
}
