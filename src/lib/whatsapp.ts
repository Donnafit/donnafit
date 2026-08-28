import type { CartItem } from "@/types"

interface OrderPayload {
  orderNumber: string
  customerName: string
  customerPhone: string
  deliveryType: "delivery" | "pickup"
  paymentMethod: "pix" | "card" | "card_link"
  deliveryAddress?: string
  pickupAddress?: string
  items: CartItem[]
  total: number
  deliveryFee?: number
  // Combo: uma escolha vale pro combo inteiro ("integral"|"branco"). Prato
  // avulso: contagem de quantas unidades daquele prato são de cada tipo —
  // permite pedir 2x do mesmo prato com uma integral e uma branco.
  riceChoices?: Record<string, "integral" | "branco" | { integral: number; branco: number }>
  pixDiscountPercentLabel?: string
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
      if (typeof choice === "string") {
        return `• ${product.name} → ${choice === "integral" ? "Integral" : "Branco"}`
      }
      // Todas as unidades do mesmo tipo: mantém o formato simples de antes.
      // Só mostra a contagem quando o prato realmente veio dividido.
      const total = choice.integral + choice.branco
      if (choice.integral === total || choice.branco === total) {
        return `• ${product.name} → ${choice.integral > 0 ? "Integral" : "Branco"}`
      }
      return `• ${product.name} → ${choice.integral}x Integral, ${choice.branco}x Branco`
    })
  const riceSection = riceLines.length > 0
    ? `\n🍚 *Tipo de Arroz:*\n${riceLines.join("\n")}`
    : ""

  const entregaTexto =
    order.deliveryType === "delivery" ? "🛵 *Entrega*" : "📦 *Retirada na loja*"

  const addressLine =
    order.deliveryType === "delivery" && order.deliveryAddress
      ? `\n📍 *Endereço:* ${order.deliveryAddress}`
      : order.deliveryType === "pickup" && order.pickupAddress
        ? `\n📍 *Endereço para retirada:* ${order.pickupAddress}`
        : ""

  const deliveryFeeLine =
    order.deliveryType === "delivery" && order.deliveryFee
      ? `\n🛵 *Taxa de entrega:* R$ ${order.deliveryFee.toFixed(2).replace(".", ",")}`
      : ""

  const paymentLabel =
    order.paymentMethod === "pix"
      ? `PIX _(desconto de ${order.pixDiscountPercentLabel ?? "2%"} já incluído no total)_`
      : order.paymentMethod === "card_link"
        ? "Cartão (link de pagamento) — enviar link manualmente"
        : "Maquininha"

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
    `${entregaTexto}${addressLine}${deliveryFeeLine}\n` +
    `💳 *Forma de pagamento:* ${paymentLabel}\n\n` +
    `💰 *Total a pagar: ${totalFormatted}*${pixPendingLine}\n\n` +
    `_Pedido registrado em ${dataHora}_`
  )
}

/**
 * No Android, `https://wa.me/...` navegado programaticamente (não por um
 * clique direto do usuário — ex.: `location.href` de uma aba pré-aberta no
 * checkout, ver CheckoutForm.tsx) nem sempre é resolvido pelo Chrome como App
 * Link pro WhatsApp instalado: em vez de abrir o app, ele cai no fallback web
 * de wa.me, que mostra a página pra baixar o app na Play Store — relatado
 * por cliente Android em 28/08/2026 (no iPhone/Safari funciona normalmente).
 * O formato `intent://` é o jeito recomendado pelo Android pra forçar a
 * resolução direta pro app instalado, com fallback pro wa.me quando o
 * WhatsApp não está instalado.
 */
function isAndroidUA(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")
  return /Android/i.test(ua)
}

export function buildWhatsAppURL(message: string, userAgent?: string): string {
  const number =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5541999154720"
  const encodedMessage = encodeURIComponent(message)
  if (isAndroidUA(userAgent)) {
    const fallbackUrl = encodeURIComponent(`https://wa.me/${number}?text=${encodedMessage}`)
    return `intent://send?phone=${number}&text=${encodedMessage}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${fallbackUrl};end`
  }
  return `https://wa.me/${number}?text=${encodedMessage}`
}

/**
 * Constrói um link wa.me a partir do WhatsApp cadastrado em
 * store_settings (texto livre, ex.: "(41) 99915-4720"). Mantém só os
 * dígitos e garante o DDI 55 na frente, sem exigir que o admin digite
 * o número já formatado pra link.
 */
export function toWhatsAppLink(rawPhone: string, fallbackNumber = "5541999154720"): string {
  const digits = rawPhone.replace(/\D/g, "")
  if (!digits) return `https://wa.me/${fallbackNumber}`
  const withDDI = digits.startsWith("55") ? digits : `55${digits}`
  return `https://wa.me/${withDDI}`
}
