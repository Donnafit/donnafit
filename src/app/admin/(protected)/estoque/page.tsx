import { createClient } from "@/lib/supabase/server"
import { EstoqueClient } from "@/components/admin/EstoqueClient"

export const dynamic = "force-dynamic"

export default async function EstoquePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: productsRaw } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("is_active", true)
    .order("sort_order")

  const products = (productsRaw ?? []) as any[]

  return <EstoqueClient products={products} />
}
