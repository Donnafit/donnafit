import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const env = Object.fromEntries(
  fs.readFileSync("/home/ubuntu/Projetos/Donna FIT/.env.local", "utf8")
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

async function main() {
  // 1. Create test product
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({
      name: "[QA_TEST] Produto Cancel-Restock",
      sku: `QA-CANCEL-${Date.now()}`,
      price: 10,
      stock_type: "individual",
      stock_quantity: 10,
      min_stock_alert: 5,
      is_active: true,
      sort_order: 9999,
    })
    .select()
    .single()
  if (prodErr) throw new Error("create product: " + prodErr.message)
  console.log("Produto criado, stock inicial =", product.stock_quantity, "id=", product.id)

  // 2. Place order via API (reserves stock)
  const res = await fetch("http://localhost:3001/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "QA Teste Cancelamento",
      customerPhone: "41999998888",
      deliveryType: "pickup",
      paymentMethod: "pix",
      items: [{ product: { id: product.id, name: product.name, price: product.price }, quantity: 3 }],
      total: 30,
    }),
  })
  const orderData = await res.json()
  console.log("Order criada:", orderData)
  if (!res.ok) throw new Error("order creation failed: " + JSON.stringify(orderData))

  const { data: afterOrder } = await supabase.from("products").select("stock_quantity").eq("id", product.id).single()
  console.log("Stock após pedido (esperado 7):", afterOrder.stock_quantity)

  // 3. Cancel the order (simulating admin panel action)
  const { data: cancelResult, error: cancelErr } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderData.orderId)
    .select("id, status")
    .single()
  console.log("Cancel result:", cancelResult, cancelErr)

  const { data: afterCancel } = await supabase.from("products").select("stock_quantity").eq("id", product.id).single()
  console.log("Stock após CANCELAMENTO (esperado voltar a 10 se restock funcionar):", afterCancel.stock_quantity)

  // Check stock_movements for any 'cancellation' or 'restock' entry
  const { data: movements } = await supabase.from("stock_movements").select("*").eq("product_id", product.id).order("created_at")
  console.log("Movimentos de estoque registrados:", JSON.stringify(movements, null, 2))

  // Cleanup
  await supabase.from("order_items").delete().eq("order_id", orderData.orderId)
  await supabase.from("orders").delete().eq("id", orderData.orderId)
  await supabase.from("stock_movements").delete().eq("product_id", product.id)
  await supabase.from("products").delete().eq("id", product.id)
  console.log("Cleanup concluído.")
}

main().catch((e) => { console.error(e); process.exit(1) })
