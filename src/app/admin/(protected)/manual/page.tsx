import { createClient } from "@/lib/supabase/server"
import { ManualClient } from "@/components/admin/ManualClient"

export const dynamic = "force-dynamic"

export default async function ManualPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: products } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("is_active", true)
    .not("prep_instructions", "is", null)
    .order("sort_order")

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <ManualClient products={(products ?? []) as any[]} />
    </div>
  )
}
