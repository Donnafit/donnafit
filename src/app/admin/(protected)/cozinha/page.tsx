import { createClient } from "@/lib/supabase/server"
import { ProductionList } from "@/components/kitchen/ProductionList"
import type { OrderWithItems } from "@/types"

export const revalidate = 0

function getTomorrowLabel() {
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
  const totalMarmitas = allOrders.reduce((sum, o) => sum + o.order_items.reduce((s, i) => s + i.quantity, 0), 0)
  const totalPedidos  = allOrders.length
  const tomorrowLabel = getTomorrowLabel()

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--forest-850) 0%, var(--forest-700) 60%, var(--forest-600) 100%)",
          padding: "28px 32px 24px",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow decorativo */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60, right: -60,
            width: 240, height: 240,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,155,60,0.10) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="flex items-start justify-between" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              Painel da Cozinha
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              Produção para amanhã —{" "}
              <span style={{ color: "var(--gold-500)", fontWeight: 600, textTransform: "capitalize" }}>
                {tomorrowLabel}
              </span>
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Cozinha
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-6" style={{ position: "relative", zIndex: 1 }}>
          {[
            { value: totalMarmitas, label: "marmitas" },
            { value: totalPedidos,  label: "pedidos" },
          ].map(({ value, label }) => (
            <div key={label} className="flex items-end gap-2">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {value}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", paddingBottom: 4 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "var(--surface-50)" }}>
        {allOrders.length === 0 ? (
          <div
            style={{
              background: "var(--surface-100)",
              borderRadius: 16,
              padding: "48px 24px",
              textAlign: "center",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: "var(--text-300)",
                fontWeight: 500,
              }}
            >
              Nenhum pedido para produção amanhã.
            </p>
          </div>
        ) : (
          <ProductionList orders={allOrders} />
        )}
      </div>
    </div>
  )
}
