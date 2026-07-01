"use client"
import { useState } from "react"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { AdminHero } from "@/components/admin/AdminHero"
import { OrderTable } from "@/components/admin/OrderTable"
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel"
import { Skeleton } from "@/components/ui/skeleton"
import type { OrderWithItems } from "@/types"

export default function PedidosPage() {
  const { orders, loading, updateStatus } = useRealtimeOrders()
  const [selected, setSelected] = useState<OrderWithItems | null>(null)

  const pending    = orders.filter((o) => o.status === "pending").length
  const production = orders.filter((o) => o.status === "production").length
  const ready      = orders.filter((o) => o.status === "ready").length

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0)

  function handleSelect(order: OrderWithItems) {
    setSelected((prev) => (prev?.id === order.id ? null : order))
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--forest-850) 0%, var(--forest-700) 60%, var(--forest-600) 100%)",
            padding: "28px 32px",
          }}
        >
          <Skeleton className="h-8 w-48 mb-2" style={{ background: "rgba(255,255,255,0.07)" }} />
          <Skeleton className="h-4 w-64 mb-6" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-t-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <AdminHero
        pendingCount={pending}
        productionCount={production}
        readyCount={ready}
        todayRevenue={todayRevenue}
        todayOrdersCount={todayOrders.length}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <OrderTable
          orders={orders}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
        />
      </div>
    </div>
  )
}
