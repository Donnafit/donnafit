"use client"
import { useState } from "react"
import { OrderCard } from "./OrderCard"
import { OrderModal } from "./OrderModal"
import type { OrderWithItems, OrderStatus } from "@/types"

const COLUMNS: {
  status: OrderStatus
  label: string
  borderColor: string
}[] = [
  { status: "pending",    label: "Pendente",  borderColor: "border-t-yellow-400" },
  { status: "production", label: "Producao",  borderColor: "border-t-blue-400" },
  { status: "ready",      label: "Pronto",    borderColor: "border-t-green-400" },
  { status: "delivered",  label: "Entregue",  borderColor: "border-t-gray-500" },
]

interface Props {
  orders: OrderWithItems[]
  onUpdateStatus: (orderId: string, status: string) => void
}

export function OrderKanban({ orders, onUpdateStatus }: Props) {
  const [selected, setSelected] = useState<OrderWithItems | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
        {COLUMNS.map(({ status, label, borderColor }) => {
          const colOrders = orders.filter((o) => o.status === status)
          return (
            <div
              key={status}
              className={`bg-gray-900 rounded-2xl border-t-4 ${borderColor} min-h-[180px]`}
            >
              <div className="p-3 border-b border-gray-800">
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {colOrders.length}{" "}
                  {colOrders.length === 1 ? "pedido" : "pedidos"}
                </p>
              </div>
              <div className="p-3 space-y-3">
                {colOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelected(order)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <OrderModal
        order={selected}
        onClose={() => setSelected(null)}
        onUpdateStatus={onUpdateStatus}
      />
    </>
  )
}
