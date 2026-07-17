import { createClient } from "@/lib/supabase/server"
import { KitchenClient } from "@/components/kitchen/KitchenClient"

export const dynamic = "force-dynamic"

export default async function CozinhaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Reposições registradas hoje
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Produtos, reposições e pedidos de produção pendentes são independentes
  // — busca em paralelo em vez de sequencial.
  const [{ data: productsRaw }, { data: restocksRaw }, { data: pendingRaw }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, stock_quantity, min_stock_alert, categories(name)")
      .eq("is_active", true)
      .order("stock_quantity", { ascending: true }), // mais urgentes primeiro
    supabase
      .from("stock_movements")
      .select("id, product_id, quantity, notes, created_at, product:products(name, sku)")
      .eq("type", "restock")
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("production_requests")
      .select("id, product_id, requested_quantity, created_at, product:products(name, sku)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ])

  const products = (productsRaw ?? []) as {
    id: string
    name: string
    sku: string | null
    stock_quantity: number
    min_stock_alert: number
    categories: { name: string } | null
  }[]

  const todayRestocks = (restocksRaw ?? []) as {
    id: string
    product_id: string
    quantity: number
    notes: string | null
    created_at: string
    product: { name: string; sku: string | null } | null
  }[]

  const pendingRequests = (pendingRaw ?? []) as {
    id: string
    product_id: string
    requested_quantity: number
    created_at: string
    product: { name: string; sku: string | null } | null
  }[]

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", height: "100%" }}>
      <KitchenClient products={products} todayRestocks={todayRestocks} pendingRequests={pendingRequests} />
    </div>
  )
}
