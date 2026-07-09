// Remove tudo que seed.mjs criou (produto, contas, e qualquer pedido/order_items
// gerado pelos testes contra o produto/contas de teste). Idempotente — pode rodar
// mesmo se e2e/.fixtures.json não existir (não faz nada nesse caso).
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

if (!fs.existsSync("e2e/.fixtures.json")) {
  console.log("Nenhuma fixture encontrada — nada para limpar.")
  process.exit(0)
}

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

const fixtures = JSON.parse(fs.readFileSync("e2e/.fixtures.json", "utf8"))

async function main() {
  // Pedidos que citam o produto de teste (via order_items) — apaga order_items e orders
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("product_id", fixtures.product.id)
  const orderIds = [...new Set((items ?? []).map((i) => i.order_id))]

  if (orderIds.length) {
    await supabase.from("order_items").delete().in("order_id", orderIds)
    await supabase.from("orders").delete().in("id", orderIds)
    console.log(`Removidos ${orderIds.length} pedido(s) de teste.`)
  }

  await supabase.from("stock_movements").delete().eq("product_id", fixtures.product.id)
  await supabase.from("products").delete().eq("id", fixtures.product.id)
  console.log("Produto de teste removido.")

  await supabase.auth.admin.deleteUser(fixtures.customer.id).catch((e) => console.warn("cliente:", e.message))
  await supabase.auth.admin.deleteUser(fixtures.admin.id).catch((e) => console.warn("admin:", e.message))
  console.log("Contas de teste removidas.")

  fs.unlinkSync("e2e/.fixtures.json")
  console.log("Limpeza concluída.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
