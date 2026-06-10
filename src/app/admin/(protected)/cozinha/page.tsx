import { createClient } from "@/lib/supabase/server"
import { ProductionList } from "@/components/kitchen/ProductionList"
import type { OrderWithItems } from "@/types"

export const revalidate = 0

function getTodayLabel() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })
}

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

  const allOrders = (orders ?? []) as OrderWithItems[]

  const totalMarmitas = allOrders.reduce(
    (sum, o) => sum + o.order_items.reduce((s, i) => s + i.quantity, 0), 0
  )
  const totalPedidos = allOrders.length

  const tomorrowLabel = getTodayLabel()

  return (
    <div className="min-h-full" style={{ background: "#F3F4F6" }}>
      {/* Dark gradient header */}
      <div style={{ background: "linear-gradient(135deg, #111827 0%, #1F2D1A 100%)", padding: "24px 24px 28px" }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white font-black" style={{ fontFamily: "var(--font-montserrat)", fontSize: 22 }}>Painel da Cozinha</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              Produção para amanhã —{" "}
              <span className="font-semibold capitalize" style={{ color: "#C89B3C" }}>{tomorrowLabel}</span>
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.8)" }}>
            Cozinha
          </span>
        </div>

        {/* Metrics in header */}
        <div className="flex gap-4 mt-5">
          <div className="text-center">
            <p className="text-white font-black" style={{ fontFamily: "var(--font-montserrat)", fontSize: 36, lineHeight: 1 }}>{totalMarmitas}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>marmitas</p>
          </div>
          <div className="w-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="text-center">
            <p className="text-white font-black" style={{ fontFamily: "var(--font-montserrat)", fontSize: 36, lineHeight: 1 }}>{totalPedidos}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>pedidos</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {allOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-3xl mb-3">--</p>
            <p className="text-gray-500 font-medium">Nenhum pedido para produção amanhã.</p>
          </div>
        ) : (
          <ProductionList orders={allOrders} />
        )}
      </div>
    </div>
  )
}
