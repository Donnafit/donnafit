"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FiscalCopyButton } from "./FiscalCopyButton"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:    "production",
  production: "ready",
  ready:      "delivered",
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:    "Iniciar Producao",
  production: "Marcar como Pronto",
  ready:      "Confirmar Entrega",
}

interface Props {
  order: OrderWithItems | null
  onClose: () => void
  onUpdateStatus: (orderId: string, status: string) => Promise<void> | void
}

export function OrderModal({ order, onClose, onUpdateStatus }: Props) {
  if (!order) return null

  const nextStatus = NEXT_STATUS[order.status as OrderStatus]
  const nextLabel  = NEXT_LABEL[order.status as OrderStatus]

  const handleStatusChange = async (next: string) => {
    try {
      await onUpdateStatus(order.id, next)
      onClose()
    } catch (err) {
      console.error("Erro ao atualizar status:", err)
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">
            #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Customer info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5">
            <p className="font-bold text-gray-900">{order.customer_name}</p>
            <p className="text-sm text-gray-600">{order.customer_phone}</p>
            <p className="text-sm text-gray-600">
              {order.delivery_type === "delivery" ? "Entrega" : "Retirada"}
            </p>
            {order.delivery_type === "delivery" && order.delivery_address && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Endereco: </span>
                {order.delivery_address}
              </p>
            )}
            <p className="text-sm text-gray-600">
              {order.payment_method === "pix" ? "PIX" : "Maquininha na entrega"}
            </p>
            <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
          </div>

          {/* Items */}
          <div>
            <p className="font-semibold text-gray-900 mb-2">Itens do pedido</p>
            <div className="space-y-1">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="text-gray-700">
                    {item.quantity}x {item.product_name}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-black text-base pt-3 mt-1">
              <span>Total</span>
              <span className="text-brand-gold">
                {formatCurrency(Number(order.total))}
              </span>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          {order.notes && order.notes.trim() !== "" && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Observacoes:</p>
              <p className="text-sm text-gray-800">{order.notes}</p>
            </div>
          )}

          {/* Fiscal copy — Phase 1 bridge */}
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-700 mb-2 font-medium">
              Fase 1 — copie os dados para lancar no sistema de notas:
            </p>
            <FiscalCopyButton order={order} />
          </div>

          {/* Advance status */}
          {nextStatus && nextLabel && (
            <Button
              className="w-full h-12 rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white font-bold"
              onClick={() => handleStatusChange(nextStatus)}
            >
              {nextLabel}
            </Button>
          )}

          {order.status === "delivered" && (
            <p className="text-center text-sm text-gray-400">
              Pedido entregue
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
