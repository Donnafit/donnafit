"use client"
import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OrderWithItems } from "@/types"

interface Props {
  order: OrderWithItems
}

function buildFiscalText(order: OrderWithItems): string {
  const lines = [
    `=== DADOS PARA NF / CUPOM FISCAL ===`,
    `Pedido: #${order.order_number}`,
    `Data: ${new Date(order.created_at).toLocaleDateString("pt-BR")} ${new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    ``,
    `CLIENTE`,
    `Nome: ${order.customer_name}`,
    `Fone: ${order.customer_phone}`,
    ``,
    `ITENS`,
    ...order.order_items.map(
      (item) =>
        `${item.quantity}x ${item.product_name}${item.product_sku ? ` (SKU ${item.product_sku})` : ""} — R$ ${(item.unit_price * item.quantity).toFixed(2).replace(".", ",")}`
    ),
    ``,
    `TOTAL: R$ ${Number(order.total).toFixed(2).replace(".", ",")}`,
    `Pagamento: ${order.payment_method === "pix" ? "PIX" : "Cartão/Maquininha"}`,
    `Tipo: ${order.delivery_type === "delivery" ? "Entrega" : "Retirada"}`,
    `===================================`,
  ]
  return lines.join("\n")
}

export function FiscalCopyButton({ order }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = buildFiscalText(order)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2 border-brand-gold text-brand-gold hover:bg-brand-gold/10 font-semibold"
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "Copiado!" : "Copiar p/ NF"}
    </Button>
  )
}
