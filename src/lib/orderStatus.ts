import type { OrderWithItems } from "@/types"

type OrderLike = Pick<OrderWithItems, "status" | "delivery_type">

export interface StatusPill {
  label: string
  bg: string
  color: string
  pip: string
}

/** Rótulo/cor do selo de status, considerando se é entrega ou retirada. */
export function getStatusPill(order: OrderLike): StatusPill {
  switch (order.status) {
    case "pending":
      return { label: "Pendente", bg: "#FEF3C7", color: "#92400E", pip: "#F59E0B" }
    case "production":
      return { label: "Em Separação", bg: "#DBEAFE", color: "#1E40AF", pip: "#3B82F6" }
    case "ready":
      return order.delivery_type === "pickup"
        ? { label: "No Balcão", bg: "#EDE9FE", color: "#5B21B6", pip: "#8B5CF6" }
        : { label: "Liberado", bg: "#D1FAE5", color: "#065F46", pip: "#10B981" }
    case "out_for_delivery":
      return { label: "Em Rota", bg: "#FFEDD5", color: "#9A3412", pip: "#FB923C" }
    case "delivered":
      return order.delivery_type === "pickup"
        ? { label: "Retirado", bg: "#F3F4F6", color: "#6B7280", pip: "#9CA3AF" }
        : { label: "Entregue", bg: "#F3F4F6", color: "#6B7280", pip: "#9CA3AF" }
    default:
      return { label: order.status, bg: "#F3F4F6", color: "#6B7280", pip: "#9CA3AF" }
  }
}

/** Próximo status do pedido e rótulo do botão de ação, ou null se já é terminal. */
export function getNextStep(order: OrderLike): { status: string; label: string } | null {
  switch (order.status) {
    case "pending":
      return { status: "production", label: "Iniciar Separação" }
    case "production":
      return { status: "ready", label: "Liberar Pedido" }
    case "ready":
      return order.delivery_type === "delivery"
        ? { status: "out_for_delivery", label: "Saiu para Entrega" }
        : { status: "delivered", label: "Confirmar Retirada" }
    case "out_for_delivery":
      return { status: "delivered", label: "Confirmar Entrega" }
    default:
      return null
  }
}

/** Colunas do Kanban de pedidos, na ordem em que aparecem. */
export const KANBAN_COLUMNS: { key: string; label: string; match: (o: OrderLike) => boolean }[] = [
  { key: "pending", label: "Pendente", match: (o) => o.status === "pending" },
  { key: "production", label: "Em Separação", match: (o) => o.status === "production" },
  { key: "balcao", label: "Balcão", match: (o) => o.status === "ready" && o.delivery_type === "pickup" },
  {
    key: "rota",
    label: "Rota de Entrega",
    match: (o) => (o.status === "ready" && o.delivery_type === "delivery") || o.status === "out_for_delivery",
  },
]
