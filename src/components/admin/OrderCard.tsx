"use client"
import { formatCurrency } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function getAvatarColor(name: string) {
  const colors = [
    "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
    "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatRelativeTime(dateString: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH}h`
  return `há ${Math.floor(diffH / 24)}d`
}

const NEXT_STATUS: Record<string, { label: string; next: string; bg: string }> = {
  pending:    { label: "Iniciar Preparo",   next: "production", bg: "#F59E0B" },
  production: { label: "Marcar Pronto",     next: "ready",      bg: "#5A6B2A" },
  ready:      { label: "Confirmar Entrega", next: "delivered",  bg: "#3B82F6" },
}

interface Props {
  order: OrderWithItems
  onClick: () => void
  onUpdateStatus?: (orderId: string, status: string) => void
}

export function OrderCard({ order, onClick, onUpdateStatus }: Props) {
  const avatarColor = getAvatarColor(order.customer_name)
  const isDelivery  = order.delivery_type === "delivery"
  const isPix       = order.payment_method === "pix"
  const isCardLink  = order.payment_method === "card_link"
  const next        = NEXT_STATUS[order.status]

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        border: "1px solid #F3F4F6",
        animation: "cardEnter 0.26s ease forwards",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ background: avatarColor, fontSize: 11, fontWeight: 700 }}
        >
          {getInitials(order.customer_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{order.customer_name}</p>
          <p className="text-xs text-gray-400">{formatRelativeTime(order.created_at)}</p>
        </div>
      </div>

      {/* Order number */}
      <p
        className="text-xs font-bold mb-2"
        style={{ color: "#C89B3C", fontFamily: "var(--font-ui)" }}
      >
        #{order.order_number}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={
            isDelivery
              ? { background: "#EFF6FF", color: "#3B82F6" }
              : { background: "#F5F3FF", color: "#7C3AED" }
          }
        >
          {isDelivery ? "Entrega" : "Retirada"}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={
            isPix
              ? { background: "#F0FDF4", color: "#16A34A" }
              : isCardLink
                ? { background: "#FEF3C7", color: "#B45309" }
                : { background: "#EFF6FF", color: "#2563EB" }
          }
        >
          {isPix ? "PIX" : isCardLink ? "Link" : "Cartão"}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {order.order_items?.length ?? 0}{" "}
          {(order.order_items?.length ?? 0) === 1 ? "item" : "itens"}
        </span>
        <span className="font-bold text-sm" style={{ color: "#C89B3C" }}>
          {formatCurrency(Number(order.total))}
        </span>
      </div>

      {/* Action button */}
      {next && onUpdateStatus && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUpdateStatus(order.id, next.next)
          }}
          className="w-full mt-3 py-1.5 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-85"
          style={{ background: next.bg }}
        >
          {next.label}
        </button>
      )}

      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </button>
  )
}
