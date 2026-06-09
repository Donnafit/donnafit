import type { CartItem } from "@/types"

interface OrderPayload {
  orderNumber: string
  customerName: string
  customerPhone: string
  deliveryType: "delivery" | "pickup"
  paymentMethod: "pix" | "card"
  deliveryAddress?: string
  items: CartItem[]
  total: number
}

export function buildWhatsAppMessage(order: OrderPayload): string {
  const deliveryLabel =
    order.deliveryType === "delivery" ? "Entrega" : "Retirada"
  const paymentLabel =
    order.paymentMethod === "pix" ? "PIX" : "Maquininha na entrega"

  const itemLines = order.items
    .map(
      ({ product, quantity }) =>
        `  • ${quantity}x ${product.name} — R$ ${(product.price * quantity)
          .toFixed(2)
          .replace(".", ",")}`
    )
    .join("\n")

  const addressLine =
    order.deliveryType === "delivery" && order.deliveryAddress
      ? `*Endereço:* ${order.deliveryAddress}\n`
      : ""

  return (
    `*Pedido Donna FIT*\n` +
    `*ID:* #${order.orderNumber}\n\n` +
    `*Cliente:* ${order.customerName}\n` +
    `*Telefone:* ${order.customerPhone}\n\n` +
    `*Itens:*\n${itemLines}\n\n` +
    `*Total:* R$ ${order.total.toFixed(2).replace(".", ",")}\n` +
    `*Forma de recebimento:* ${deliveryLabel}\n` +
    addressLine +
    `*Forma de pagamento:* ${paymentLabel}`
  )
}

export function buildWhatsAppURL(message: string): string {
  const number =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5541999154720"
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
