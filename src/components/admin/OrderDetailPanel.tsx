"use client"
import { X } from "lucide-react"
import { FiscalCopyButton } from "./FiscalCopyButton"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:    "production",
  production: "ready",
  ready:      "delivered",
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:    "Iniciar Produção",
  production: "Marcar como Pronto",
  ready:      "Confirmar Entrega",
}

const STATUS_PILLS: Record<string, { bg: string; color: string; pip: string; label: string }> = {
  pending:    { bg: "#FEF3C7", color: "#92400E", pip: "#F59E0B", label: "Pendente" },
  production: { bg: "#DBEAFE", color: "#1E40AF", pip: "#3B82F6", label: "Em Produção" },
  ready:      { bg: "#D1FAE5", color: "#065F46", pip: "#10B981", label: "Pronto" },
  delivered:  { bg: "#F3F4F6", color: "#6B7280", pip: "#9CA3AF", label: "Entregue" },
}

interface Props {
  order: OrderWithItems | null
  onClose: () => void
  onUpdateStatus: (orderId: string, status: string) => Promise<void> | void
}

export function OrderDetailPanel({ order, onClose, onUpdateStatus }: Props) {
  const nextStatus = order ? NEXT_STATUS[order.status as OrderStatus] : undefined
  const nextLabel  = order ? NEXT_LABEL[order.status as OrderStatus]  : undefined
  const pill       = order ? (STATUS_PILLS[order.status] ?? STATUS_PILLS.delivered) : null

  async function handleAdvance() {
    if (!order || !nextStatus) return
    try {
      await onUpdateStatus(order.id, nextStatus)
      onClose()
    } catch (err) {
      console.error("Erro ao atualizar status:", err)
    }
  }

  return (
    <div
      style={{
        width: 280,
        background: "var(--surface-100)",
        borderLeft: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transform: order ? "translateX(0)" : "translateX(100%)",
        transition: `transform var(--duration-panel) var(--ease-out)`,
        overflow: "hidden",
      }}
    >
      {order && (
        <>
          {/* Header */}
          <div
            className="flex items-start justify-between"
            style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "var(--text-300)",
                  marginBottom: 3,
                }}
              >
                Pedido #{order.order_number} · {formatDate(order.created_at)}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--text-950)",
                  lineHeight: 1.2,
                }}
              >
                {order.customer_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center"
              style={{
                width: 26, height: 26,
                borderRadius: 6,
                background: "var(--surface-50)",
                border: "1px solid rgba(0,0,0,0.07)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={12} strokeWidth={1.8} style={{ color: "var(--text-500)" }} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto" style={{ padding: "16px 20px" }}>
            {[
              { label: "Telefone",  value: order.customer_phone },
              { label: "Tipo",      value: order.delivery_type === "delivery" ? "Entrega" : "Retirada" },
              ...(order.delivery_type === "delivery" && order.delivery_address
                ? [{ label: "Endereço", value: order.delivery_address }]
                : []),
              { label: "Pagamento", value: order.payment_method === "pix" ? "PIX" : "Maquininha" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between"
                style={{ padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)" }}>
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-950)",
                    textAlign: "right",
                    maxWidth: 160,
                  }}
                >
                  {value ?? "—"}
                </span>
              </div>
            ))}

            {/* Itens */}
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--text-300)",
                marginTop: 16,
                marginBottom: 6,
              }}
            >
              Itens
            </p>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between"
                style={{ padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}
              >
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-700)" }}>
                  {item.quantity}× {item.product_name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-950)",
                  }}
                >
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between" style={{ padding: "10px 0", marginTop: 2 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--text-950)",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--gold-500)",
                }}
              >
                {formatCurrency(Number(order.total))}
              </span>
            </div>

            {/* Status */}
            <div
              className="flex justify-between items-center"
              style={{ padding: "9px 0", borderTop: "1px solid rgba(0,0,0,0.06)" }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)" }}>
                Status
              </span>
              {pill && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    background: pill.bg,
                    color: pill.color,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  <span
                    style={{ width: 5, height: 5, borderRadius: "50%", background: pill.pip, flexShrink: 0 }}
                  />
                  {pill.label}
                </span>
              )}
            </div>

            {/* Notas */}
            {order.notes && order.notes.trim() && (
              <div
                style={{
                  background: "var(--surface-50)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 8,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-300)",
                    marginBottom: 4,
                  }}
                >
                  Observações
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-700)" }}>
                  {order.notes}
                </p>
              </div>
            )}

            {/* Fiscal copy */}
            <div
              style={{
                background: "#FFFBEB",
                borderRadius: 8,
                padding: "10px 12px",
                marginTop: 12,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "#92400E",
                  fontWeight: 500,
                  marginBottom: 6,
                }}
              >
                Fase 1 — copie os dados fiscais:
              </p>
              <FiscalCopyButton order={order} />
            </div>
          </div>

          {/* Actions */}
          {nextStatus && nextLabel && (
            <div style={{ padding: "0 20px 8px" }}>
              <button
                onClick={handleAdvance}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "11px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                  color: "#000",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 12px rgba(200,155,60,0.25)",
                  transition: "box-shadow var(--duration-standard), transform var(--duration-micro)",
                }}
              >
                {nextLabel}
              </button>
            </div>
          )}

          {order.status === "delivered" && (
            <p
              style={{
                textAlign: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--text-300)",
                padding: "0 20px 20px",
              }}
            >
              Pedido entregue
            </p>
          )}

          <div style={{ height: 16 }} />
        </>
      )}
    </div>
  )
}
