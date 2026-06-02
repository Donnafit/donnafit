"use client"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { OrderKanban } from "@/components/admin/OrderKanban"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

export default function PedidosPage() {
  const { orders, loading, updateStatus } = useRealtimeOrders()

  const pending = orders.filter((o) => o.status === "pending").length

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })

  const todayRevenue = todayOrders.reduce(
    (s, o) => s + Number(o.total),
    0
  )

  return (
    <div className="text-white min-h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-black">Gestao de Pedidos</h1>
        <div className="flex gap-3 mt-3 overflow-x-auto pb-1">
          <div className="bg-gray-800 rounded-xl px-4 py-2 shrink-0">
            <p className="text-xs text-gray-400">Pendentes</p>
            <p className="text-2xl font-black text-yellow-400">{pending}</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2 shrink-0">
            <p className="text-xs text-gray-400">Pedidos hoje</p>
            <p className="text-2xl font-black text-white">{todayOrders.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2 shrink-0">
            <p className="text-xs text-gray-400">Faturamento hoje</p>
            <p className="text-xl font-black text-brand-gold">
              {formatCurrency(todayRevenue)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-gray-800" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <p className="text-4xl mb-3">--</p>
          <p className="font-medium">Nenhum pedido ativo no momento.</p>
        </div>
      ) : (
        <OrderKanban orders={orders} onUpdateStatus={updateStatus} />
      )}
    </div>
  )
}
