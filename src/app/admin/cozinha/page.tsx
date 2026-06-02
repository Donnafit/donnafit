import { createClient } from "@/lib/supabase/server"
import { ProductionList } from "@/components/kitchen/ProductionList"
import type { OrderWithItems } from "@/types"

export const revalidate = 30

export default async function CozinhaPage() {
  const supabase = await createClient()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0]

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*, product:products(*))")
    .eq("delivery_date", tomorrowStr)
    .not("status", "eq", "cancelled")
    .order("created_at")

  const totalMarmitas = (orders ?? []).reduce(
    (sum, o) =>
      sum +
      (o as OrderWithItems).order_items.reduce(
        (s, i) => s + i.quantity,
        0
      ),
    0
  )

  const tomorrowLabel = tomorrow.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  })

  return (
    <div className="text-white p-4">
      <div className="mb-6">
        <h1 className="text-xl font-black">Painel da Cozinha</h1>
        <p className="text-sm text-gray-400 mt-1">
          Producao para amanha —{" "}
          <span className="text-brand-gold font-semibold capitalize">
            {tomorrowLabel}
          </span>
        </p>
        <div className="flex gap-3 mt-3">
          <div className="bg-gray-800 rounded-xl px-4 py-2">
            <p className="text-xs text-gray-400">Total de marmitas</p>
            <p className="text-3xl font-black text-brand-gold">
              {totalMarmitas}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2">
            <p className="text-xs text-gray-400">Pedidos</p>
            <p className="text-3xl font-black text-white">
              {(orders ?? []).length}
            </p>
          </div>
        </div>
      </div>

      <ProductionList orders={(orders ?? []) as OrderWithItems[]} />
    </div>
  )
}
