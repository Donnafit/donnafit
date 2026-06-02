"use client"
import { ChevronRight } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:    "Pendente",
  production: "Produção",
  ready:      "Pronto",
  delivered:  "Entregue",
  cancelled:  "Cancelado",
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  production: "bg-blue-100 text-blue-800",
  ready:      "bg-green-100 text-green-800",
  delivered:  "bg-gray-100 text-gray-500",
  cancelled:  "bg-red-100 text-red-600",
}

interface Props {
  order: OrderWithItems
  onClick: () => void
}

export function OrderCard({ order, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-brand-gold transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-gray-900">#{order.order_number}</p>
          <p className="text-sm text-gray-600 truncate mt-0.5">
            {order.customer_name}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(order.created_at)}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            STATUS_COLOR[order.status as OrderStatus]
          }`}
        >
          {STATUS_LABEL[order.status as OrderStatus]}
        </span>
        <span className="font-bold text-brand-gold">
          {formatCurrency(Number(order.total))}
        </span>
      </div>
    </button>
  )
}
