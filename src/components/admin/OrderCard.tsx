"use client"
import { ChevronRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH}h ${diffMin % 60}min`
  return `há ${Math.floor(diffH / 24)}d`
}

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  pending:    { label: 'Iniciar Preparo', next: 'production' },
  production: { label: 'Marcar Pronto',   next: 'ready' },
  ready:      { label: 'Confirmar Entrega', next: 'delivered' },
}

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
  onUpdateStatus?: (orderId: string, status: string) => void
}

export function OrderCard({ order, onClick, onUpdateStatus }: Props) {
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
            {formatRelativeTime(order.created_at)}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
      </div>
      {order.order_items && order.order_items.length > 0 && (
        <span style={{ fontSize: 12, color: '#888' }}>
          {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'itens'} · R$ {Number(order.total)?.toFixed(2).replace('.', ',')}
        </span>
      )}
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
      {NEXT_STATUS[order.status] && onUpdateStatus && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUpdateStatus(order.id, NEXT_STATUS[order.status].next)
          }}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '6px 12px',
            background: '#5A6B2A',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {NEXT_STATUS[order.status].label}
        </button>
      )}
    </button>
  )
}
