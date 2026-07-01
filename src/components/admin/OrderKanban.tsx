"use client"
import { useState } from "react"
import { OrderCard } from "./OrderCard"
import { OrderModal } from "./OrderModal"
import type { OrderWithItems, OrderStatus } from "@/types"

const COLUMNS: {
  status: OrderStatus
  label: string
  dotColor: string
  badgeBg: string
}[] = [
  { status: "pending",    label: "Pendente", dotColor: "#F59E0B", badgeBg: "#FEF3C7" },
  { status: "production", label: "Produção", dotColor: "#3B82F6", badgeBg: "#DBEAFE" },
  { status: "ready",      label: "Pronto",   dotColor: "#10B981", badgeBg: "#D1FAE5" },
  { status: "delivered",  label: "Entregue", dotColor: "#9CA3AF", badgeBg: "#F3F4F6" },
]

interface Props {
  orders: OrderWithItems[]
  onUpdateStatus: (orderId: string, status: string) => void
}

export function OrderKanban({ orders, onUpdateStatus }: Props) {
  const [selected, setSelected] = useState<OrderWithItems | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, label, dotColor, badgeBg }) => {
          const colOrders = orders.filter((o) => o.status === status)
          return (
            <div
              key={status}
              className="rounded-2xl"
              style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
            >
              <div
                className="flex items-center justify-between p-4"
                style={{ borderBottom: "1px solid #E5E7EB" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: dotColor }}
                  />
                  <span
                    className="text-sm font-bold text-gray-800"
                    style={{ fontFamily: "var(--font-ui)" }}
                  >
                    {label}
                  </span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: badgeBg, color: dotColor }}
                >
                  {colOrders.length}
                </span>
              </div>
              <div className="p-3 flex flex-col gap-3 min-h-[120px]">
                {colOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelected(order)}
                    onUpdateStatus={onUpdateStatus}
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
