"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/useCart"
import { buildWhatsAppMessage, buildWhatsAppURL } from "@/lib/whatsapp"
import { formatCurrency } from "@/lib/utils"

export function CheckoutForm() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery")
  const [payment, setPayment] = useState<"pix" | "card">("pix")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Nome é obrigatório"
    if (!phone.trim()) e.phone = "WhatsApp é obrigatório"
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryType: delivery,
          paymentMethod: payment,
          items,
          total: total(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const msg = buildWhatsAppMessage({
        orderNumber: data.orderNumber,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryType: delivery,
        paymentMethod: payment,
        items,
        total: total(),
      })

      window.open(buildWhatsAppURL(msg), "_blank")
      clearCart()
      router.push(`/confirmacao?id=${data.orderNumber}`)
    } catch {
      setErrors({ submit: "Erro ao enviar pedido. Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="name">Seu nome *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como você se chama?"
          className="mt-1 h-12 rounded-xl"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">WhatsApp *</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(41) 99999-9999"
          className="mt-1 h-12 rounded-xl"
        />
        {errors.phone && (
          <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
        )}
      </div>

      <div>
        <Label>Como prefere receber?</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(["delivery", "pickup"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setDelivery(type)}
              className={`h-12 rounded-xl border-2 text-sm font-semibold transition-colors ${
                delivery === type
                  ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {type === "delivery" ? "🚚 Entrega" : "🏪 Retirada"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Forma de pagamento</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(["pix", "card"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPayment(method)}
              className={`h-12 rounded-xl border-2 text-sm font-semibold transition-colors ${
                payment === method
                  ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {method === "pix" ? "💰 PIX" : "💳 Maquininha"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        <p className="font-semibold text-gray-700 text-sm">Resumo do pedido</p>
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex justify-between text-sm text-gray-600"
          >
            <span>
              {item.quantity}x {item.product.name}
            </span>
            <span>{formatCurrency(item.product.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
          <span>Total</span>
          <span className="text-brand-gold">{formatCurrency(total())}</span>
        </div>
      </div>

      {errors.submit && (
        <p className="text-red-500 text-sm">{errors.submit}</p>
      )}

      <Button
        type="submit"
        disabled={loading || items.length === 0}
        className="w-full h-14 text-base font-bold rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white"
      >
        {loading ? "Enviando..." : "📲 Confirmar e Abrir WhatsApp"}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        O WhatsApp da Donna FIT será aberto com seu pedido formatado.
      </p>
    </form>
  )
}
