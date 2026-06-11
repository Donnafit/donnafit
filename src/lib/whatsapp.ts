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
  riceChoices?: Record<string, "integral" | "branco">
}

export function buildWhatsAppMessage(order: OrderPayload): string {
  const agora = new Date()
  const dataHora =
    agora.toLocaleDateString("pt-BR") +
    " às " +
    agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const itemLines = order.items
    .map(
      ({ product, quantity }) =>
        `• ${quantity}x ${product.name} — R$ ${(product.price * quantity)
          .toFixed(2)
          .replace(".", ",")}`
    )
    .join("\n")

  const riceLines = order.items
    .filter(({ product }) => order.riceChoices?.[product.id])
    .map(({ product }) => {
      const choice = order.riceChoices![product.id]
      return `• ${product.name} → ${choice === "integral" ? "Integral" : "Branco"}`
    })
  const riceSection = riceLines.length > 0
    ? `\n🍚 *Tipo de Arroz:*\n${riceLines.join("\n")}`
    : ""

  const entregaTexto =
    order.deliveryType === "delivery" ? "🛵 *Entrega*" : "📦 *Retirada na loja*"

  const addressLine =
    order.deliveryType === "delivery" && order.deliveryAddress
      ? `\n📍 *Endereço:* ${order.deliveryAddress}`
      : ""

  const paymentLabel =
    order.paymentMethod === "pix" ? "PIX _(desconto de 5% já incluído no total)_" : "Maquininha"

  const totalFormatted = `R$ ${order.total.toFixed(2).replace(".", ",")}`

  const pixPendingLine =
    order.paymentMethod === "pix"
      ? `\n⏳ *Pagamento pendente* — aguardando comprovante PIX`
      : ""

  return (
    `🛒 *NOVO PEDIDO — Donna FIT*\n\n` +
    `📋 *Pedido:* #${order.orderNumber}\n` +
    `👤 *Cliente:* ${order.customerName}\n` +
    `📱 *Telefone:* ${order.customerPhone}\n\n` +
    `*Itens:*\n${itemLines}${riceSection}\n\n` +
    `${entregaTexto}${addressLine}\n` +
    `💳 *Forma de pagamento:* ${paymentLabel}\n\n` +
    `💰 *Total a pagar: ${totalFormatted}*${pixPendingLine}\n\n` +
    `_Pedido registrado em ${dataHora}_`
  )
}

export function buildWhatsAppURL(message: string): string {
  const number =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5541999154720"
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
