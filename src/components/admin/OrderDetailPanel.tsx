"use client"
import { useEffect, useState } from "react"
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
  // Keep content rendered during close animation (250ms)
  const [displayOrder, setDisplayOrder] = useState<OrderWithItems | null>(null)

  useEffect(() => {
    if (order) {
      setDisplayOrder(order)
    } else {
      const t = setTimeout(() => setDisplayOrder(null), 260)
      return () => clearTimeout(t)
    }
  }, [order])

  const nextStatus = displayOrder ? NEXT_STATUS[displayOrder.status as OrderStatus] : undefined
  const nextLabel  = displayOrder ? NEXT_LABEL[displayOrder.status as OrderStatus]  : undefined
  const pill       = displayOrder ? (STATUS_PILLS[displayOrder.status] ?? STATUS_PILLS.delivered) : null

  async function handleAdvance() {
    if (!displayOrder || !nextStatus) return
    try {
      await onUpdateStatus(displayOrder.id, nextStatus)
      onClose()
    } catch (err) {
      console.error("Erro ao atualizar status:", err)
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 300,
        background: "var(--surface-100)",
        borderLeft: "1px solid var(--surface-200)",
        display: "flex",
        flexDirection: "column",
        transform: order ? "translateX(0)" : "translateX(100%)",
        transition: `transform var(--duration-panel) var(--ease-out)`,
        overflow: "hidden",
        zIndex: 10,
        boxShadow: order ? "-8px 0 24px rgba(0,0,0,0.07)" : "none",
      }}
    >
      {displayOrder && (
        <>
          {/* Header */}
          <div
            style={{
              padding: "18px 20px 14px",
              borderBottom: "1px solid var(--surface-200)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
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
                Pedido #{displayOrder.order_number} · {formatDate(displayOrder.created_at)}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-950)",
                  lineHeight: 1.2,
                }}
              >
                {displayOrder.customer_name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28,
                borderRadius: 7,
                background: "var(--surface-50)",
                border: "1px solid var(--surface-200)",
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={12} strokeWidth={1.8} style={{ color: "var(--text-500)" }} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {[
              { label: "Telefone",  value: displayOrder.customer_phone },
              { label: "Tipo",      value: displayOrder.delivery_type === "delivery" ? "Entrega" : "Retirada" },
              ...(displayOrder.delivery_type === "delivery" && displayOrder.delivery_address
                ? [{ label: "Endereço", value: displayOrder.delivery_address }]
                : []),
              { label: "Pagamento", value: displayOrder.payment_method === "pix" ? "PIX" : "Maquininha" },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: "1px solid var(--surface-200)",
                }}
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
                    maxWidth: 165,
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
            {displayOrder.order_items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "1px solid var(--surface-200)",
                }}
              >
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-700)" }}>
                  {item.quantity}× {item.product_name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0 10px",
                marginTop: 2,
                borderTop: "1px solid var(--surface-200)",
              }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, color: "var(--text-950)" }}>
                Total
              </span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 900, color: "var(--gold-500)" }}>
                {formatCurrency(Number(displayOrder.total))}
              </span>
            </div>

            {/* Status */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 0",
                borderTop: "1px solid var(--surface-200)",
              }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)" }}>Status</span>
              {pill && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: pill.bg,
                    color: pill.color,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: pill.pip, flexShrink: 0 }} />
                  {pill.label}
                </span>
              )}
            </div>

            {/* Notas */}
            {displayOrder.notes && displayOrder.notes.trim() && (
              <div
                style={{
                  background: "var(--surface-50)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 8,
                }}
              >
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600, color: "var(--text-300)", marginBottom: 4 }}>
                  Observações
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-700)" }}>
                  {displayOrder.notes}
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
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#92400E", fontWeight: 500, marginBottom: 6 }}>
                Fase 1 — copie os dados fiscais:
              </p>
              <FiscalCopyButton order={displayOrder} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--surface-200)", flexShrink: 0 }}>
            {nextStatus && nextLabel && (
              <button
                onClick={handleAdvance}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "11px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 12px rgba(200,155,60,0.25)",
                  marginBottom: 8,
                }}
              >
                {nextLabel}
              </button>
            )}
            {displayOrder.status === "delivered" && (
              <p style={{ textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>
                Pedido entregue
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
