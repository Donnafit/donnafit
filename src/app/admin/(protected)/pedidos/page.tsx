"use client"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { OrderKanban } from "@/components/admin/OrderKanban"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { Bell, ClipboardList, ChefHat, CheckCircle2, TrendingUp } from "lucide-react"

function getTodayLabel() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
}

export default function PedidosPage() {
  const { orders, loading, updateStatus } = useRealtimeOrders()

  const pending    = orders.filter((o) => o.status === "pending").length
  const production = orders.filter((o) => o.status === "production").length
  const ready      = orders.filter((o) => o.status === "ready").length

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0)

  const metrics = [
    { label: "Pendentes",        value: pending,                       icon: ClipboardList, iconBg: "#FEF3C7", iconColor: "#D97706", sub: "aguardando" },
    { label: "Em Produção",      value: production,                    icon: ChefHat,       iconBg: "#DBEAFE", iconColor: "#2563EB", sub: "preparando" },
    { label: "Prontos",          value: ready,                         icon: CheckCircle2,  iconBg: "#D1FAE5", iconColor: "#059669", sub: "aguardando retirada" },
    { label: "Faturamento hoje", value: formatCurrency(todayRevenue),  icon: TrendingUp,    iconBg: "#FEF9C3", iconColor: "#C89B3C", sub: `${todayOrders.length} pedidos` },
  ]

  return (
    <div className="min-h-full" style={{ background: "#F3F4F6" }}>
      {/* Topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
        style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}
      >
        <div>
          <h1
            className="font-black text-gray-900"
            style={{ fontFamily: "var(--font-montserrat)", fontSize: 18 }}
          >
            Gestão de Pedidos
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{getTodayLabel()}</p>
        </div>
        <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 transition-colors hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          {pending > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
      </div>

      {/* Metrics */}
      <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        {metrics.map(({ label, value, icon: Icon, iconBg, iconColor, sub }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: iconBg }}
              >
                <Icon className="h-5 w-5" style={{ color: iconColor }} />
              </div>
            </div>
            <p
              className="font-black text-gray-900 leading-none mb-1"
              style={{ fontFamily: "var(--font-montserrat)", fontSize: 30 }}
            >
              {value}
            </p>
            <p className="text-sm font-semibold text-gray-600">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="font-bold text-gray-800"
            style={{ fontFamily: "var(--font-montserrat)", fontSize: 16 }}
          >
            Quadro de Pedidos
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhum pedido ativo no momento.</p>
          </div>
        ) : (
          <OrderKanban orders={orders} onUpdateStatus={updateStatus} />
        )}
      </div>
    </div>
  )
}
