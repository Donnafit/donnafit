"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/hooks/useCart"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { buildWhatsAppMessage, buildWhatsAppURL } from "@/lib/whatsapp"
import { matchDeliveryZone } from "@/lib/deliveryZones"
import { formatCurrency } from "@/lib/utils"
import { Store, Truck, QrCode, CreditCard, Check } from "lucide-react"

const DEFAULT_PIX_DISCOUNT_RATE = 0.02

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ""
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function validateName(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 4 && trimmed.includes(" ")
}

function validatePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 10
}

export function CheckoutForm() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!user) {
      try {
        const savedGuest = localStorage.getItem("donna-fit-guest")
        if (savedGuest) {
          const guest = JSON.parse(savedGuest)
          if (guest.name && !name) {
            setName(guest.name)
            setNameState(validateName(guest.name) ? "valid" : "idle")
          }
          if (guest.phone && !phone) {
            setPhone(guest.phone)
            setPhoneState(validatePhone(guest.phone) ? "valid" : "idle")
          }
          if (guest.address && !address) {
            setAddress(guest.address)
            setAddressState("valid")
            setDelivery("delivery")
          }
        }
      } catch {}
      return
    }
    const meta = user.user_metadata ?? {}
    if (meta.name && !name) {
      const n = meta.name as string
      setName(n)
      setNameState(validateName(n) ? "valid" : "idle")
    }
    if (meta.phone && !phone) {
      const p = maskPhone(meta.phone as string)
      setPhone(p)
      setPhoneState(validatePhone(p) ? "valid" : "idle")
    }
    if (meta.delivery_address && !address) {
      setAddress(meta.delivery_address as string)
      setAddressState("valid")
      setDelivery("delivery")
    }
  }, [user])

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [nameState, setNameState] = useState<"idle" | "valid" | "invalid">("idle")
  const [phoneState, setPhoneState] = useState<"idle" | "valid" | "invalid">("idle")
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup")
  const [address, setAddress] = useState("")
  const [addressState, setAddressState] = useState<"idle" | "valid" | "invalid">("idle")
  const [zones, setZones] = useState<{ name: string; fee: number }[]>([])
  const [pixDiscountRate, setPixDiscountRate] = useState(DEFAULT_PIX_DISCOUNT_RATE)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("delivery_zones")
      .select("name, fee")
      .order("name")
      .then(({ data }) => setZones(data ?? []))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from("store_settings")
      .select("pix_discount_rate")
      .eq("id", "default")
      .single()
      .then(({ data }: { data: { pix_discount_rate: number } | null }) => {
        if (data) setPixDiscountRate(Number(data.pix_discount_rate))
      })
  }, [])
  const [payment, setPayment] = useState<"pix" | "card">("pix")
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [riceChoices, setRiceChoices] = useState<Record<string, "integral" | "branco">>({})
  const [riceMode, setRiceMode] = useState<"same" | "individual">("same")
  const [sameRiceType, setSameRiceType] = useState<"integral" | "branco" | null>(null)
  const [showRiceModal, setShowRiceModal] = useState(false)

  const cartItems = mounted ? items : []
  const allRiceItems = cartItems.filter(item =>
    item.product.description?.toLowerCase().includes("arroz")
  )
  // Alguns pratos só servem arroz branco — não faz sentido perguntar.
  const riceItems = allRiceItems.filter(item => item.product.rice_integral_available)
  const autoBrancoRiceItems = allRiceItems.filter(item => !item.product.rice_integral_available)
  const allRiceChosen = riceMode === "same"
    ? sameRiceType !== null
    : riceItems.every(item => !!riceChoices[item.product.id])

  function switchToIndividualRice() {
    if (sameRiceType) {
      setRiceChoices(prev => {
        const next = { ...prev }
        riceItems.forEach(item => { if (!next[item.product.id]) next[item.product.id] = sameRiceType })
        return next
      })
    }
    setRiceMode("individual")
  }

  function finalRiceChoices(): Record<string, "integral" | "branco"> {
    const chosen = riceMode === "same" && sameRiceType
      ? Object.fromEntries(riceItems.map(item => [item.product.id, sameRiceType]))
      : riceChoices
    const auto = Object.fromEntries(autoBrancoRiceItems.map(item => [item.product.id, "branco" as const]))
    return { ...chosen, ...auto }
  }
  const subtotal = mounted ? total() : 0
  const matchedZone = delivery === "delivery" ? matchDeliveryZone(address, zones) : null
  const deliveryFee = matchedZone ? matchedZone.fee : 0
  const pixDiscount = payment === "pix" ? subtotal * pixDiscountRate : 0
  const pixDiscountPercentLabel = `${(pixDiscountRate * 100).toFixed(pixDiscountRate * 100 % 1 === 0 ? 0 : 1)}%`
  const finalTotal = subtotal + deliveryFee - pixDiscount

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setName(val)
    if (val.length > 0) {
      setNameState(validateName(val) ? "valid" : "invalid")
    } else {
      setNameState("idle")
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskPhone(e.target.value)
    setPhone(masked)
    const digits = masked.replace(/\D/g, "")
    if (digits.length > 0) {
      setPhoneState(validatePhone(masked) ? "valid" : "invalid")
    } else {
      setPhoneState("idle")
    }
  }

  function isFormValid(): boolean {
    const nameOk = validateName(name)
    const phoneOk = validatePhone(phone)
    const addressOk = delivery === "pickup" || (address.trim().length >= 10 && !!matchedZone)
    return nameOk && phoneOk && addressOk
  }

  async function doSubmit() {
    // Precisa abrir a aba AGORA, ainda dentro do clique síncrono do usuário —
    // se abrir só depois do await fetch(), navegadores mobile (principalmente
    // iOS Safari) bloqueiam o popup silenciosamente por perder a associação
    // com o gesto do usuário, e o cliente vê a tela "travar" sem o WhatsApp abrir.
    const waWindow = window.open("", "_blank")
    setLoading(true)
    setSubmitError("")
    try {
      const computedRiceChoices = finalRiceChoices()
      const activeRiceChoices = Object.keys(computedRiceChoices).length > 0 ? computedRiceChoices : undefined
      const fullAddress = delivery === "delivery" ? address.trim() : undefined
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryType: delivery,
          deliveryAddress: fullAddress,
          paymentMethod: payment,
          items: cartItems,
          total: finalTotal,
          riceChoices: activeRiceChoices,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || "Erro ao criar pedido")

      const msg = buildWhatsAppMessage({
        orderNumber: data.orderNumber,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryType: delivery,
        deliveryAddress: fullAddress,
        paymentMethod: payment,
        items: cartItems,
        total: finalTotal,
        riceChoices: activeRiceChoices,
      })

      const waUrl = buildWhatsAppURL(msg)
      const encodedWa = encodeURIComponent(waUrl)

      try {
        localStorage.setItem("donna-fit-order-summary", JSON.stringify({
          items: cartItems.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price * i.quantity })),
          deliveryType: delivery,
          paymentMethod: payment,
          total: finalTotal,
        }))
        if (!user) {
          localStorage.setItem("donna-fit-guest", JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            address: fullAddress ?? "",
          }))
        }
      } catch {}

      if (user) {
        try {
          const supabase = createClient()
          const updateData: Record<string, string> = {}
          if (delivery === "delivery" && fullAddress) {
            updateData.delivery_address = fullAddress
          }
          if (Object.keys(updateData).length > 0) {
            await supabase.auth.updateUser({ data: updateData })
          }
        } catch {}
      }

      clearCart()
      if (waWindow) waWindow.location.href = waUrl
      else window.open(waUrl, "_blank")
      router.push(`/confirmacao?order=${data.orderNumber}&wa=${encodedWa}`)
    } catch (err) {
      waWindow?.close()
      setSubmitError(err instanceof Error ? err.message : "Erro ao enviar pedido. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit() {
    const nameOk = validateName(name)
    const phoneOk = validatePhone(phone)
    const addressOk = delivery === "pickup" || (address.trim().length >= 10 && !!matchedZone)

    setNameState(nameOk ? "valid" : "invalid")
    setPhoneState(phoneOk ? "valid" : "invalid")
    if (delivery === "delivery") setAddressState(addressOk ? "valid" : "invalid")

    if (!nameOk || !phoneOk || !addressOk || cartItems.length === 0) return

    if (riceItems.length > 0) {
      setShowRiceModal(true)
      return
    }

    void doSubmit()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Secao: Contato */}
      <div className="card-white">
        {/* Header numerado */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#C89B3C",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-montserrat, Montserrat)" }}>1</span>
          </div>
          <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 15, color: "#1A1A1A" }}>
            Informacoes de contato
          </span>
        </div>

        {/* Campo nome */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Nome completo
          </label>
          <input
            type="text"
            className={`form-input ${nameState === "valid" ? "input-valid" : nameState === "invalid" ? "input-invalid" : ""}`}
            value={name}
            onChange={handleNameChange}
            placeholder="Seu nome e sobrenome"
            autoComplete="name"
          />
          <p className={`error-msg ${nameState === "invalid" ? "show" : ""}`}>
            Informe nome e sobrenome (minimo 4 caracteres)
          </p>
        </div>

        {/* Campo telefone */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            WhatsApp
          </label>
          <input
            type="tel"
            className={`form-input ${phoneState === "valid" ? "input-valid" : phoneState === "invalid" ? "input-invalid" : ""}`}
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(41) 99999-9999"
            autoComplete="tel"
          />
          <p className={`error-msg ${phoneState === "invalid" ? "show" : ""}`}>
            Informe um numero valido com DDD
          </p>
        </div>
      </div>

      {/* Secao: Entrega */}
      <div className="card-white">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#C89B3C",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-montserrat, Montserrat)" }}>2</span>
          </div>
          <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 15, color: "#1A1A1A" }}>
            Forma de entrega
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Retirada */}
          <button
            type="button"
            onClick={() => { setDelivery("pickup"); setAddressState("idle") }}
            className={`option-card ${delivery === "pickup" ? "selected" : ""}`}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Store size={28} style={{ color: "#C89B3C" }} />
            </div>
            <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 4 }}>Retirada</div>
            <div style={{ fontSize: 12, color: "#5A6B2A", fontWeight: 600 }}>Gratis</div>
            <div className="option-check">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>

          {/* Entrega */}
          <button
            type="button"
            onClick={() => setDelivery("delivery")}
            className={`option-card ${delivery === "delivery" ? "selected" : ""}`}
          >

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Truck size={28} style={{ color: "#C89B3C" }} />
            </div>
            <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 4 }}>Entrega</div>
            <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>
              {matchedZone ? `+ ${formatCurrency(matchedZone.fee)}` : "Varia por bairro"}
            </div>
            <div className="option-check">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        </div>

        {/* Campo de endereço — aparece somente quando Entrega está selecionada */}
        {delivery === "delivery" && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Endereço de entrega
            </label>
            <input
              type="text"
              className={`form-input ${addressState === "valid" ? "input-valid" : addressState === "invalid" ? "input-invalid" : ""}`}
              value={address}
              onChange={e => {
                const val = e.target.value
                setAddress(val)
                if (val.length > 0) setAddressState(val.trim().length >= 10 ? "valid" : "invalid")
                else setAddressState("idle")
              }}
              placeholder="Rua, número, bairro, complemento"
              autoComplete="street-address"
            />
            <p className={`error-msg ${addressState === "invalid" ? "show" : ""}`}>
              Informe o endereço completo para entrega
            </p>
            {addressState === "valid" && (
              matchedZone ? (
                <p style={{ fontSize: 12, color: "#5A6B2A", fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={13} /> Bairro identificado: {matchedZone.name} — frete {formatCurrency(matchedZone.fee)}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "#B45309", fontWeight: 600, marginTop: 8 }}>
                  Não conseguimos identificar o bairro no endereço. Inclua o nome do bairro
                  ou fale pelo{" "}
                  <a href="https://wa.me/5541999154720" target="_blank" rel="noopener noreferrer" style={{ color: "#5A6B2A", textDecoration: "underline" }}>
                    WhatsApp
                  </a>.
                </p>
              )
            )}
          </div>
        )}
      </div>

      {/* Secao: Pagamento */}
      <div className="card-white">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#C89B3C",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-montserrat, Montserrat)" }}>3</span>
          </div>
          <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 15, color: "#1A1A1A" }}>
            Forma de pagamento
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* PIX */}
          <button
            type="button"
            onClick={() => setPayment("pix")}
            className={`option-card ${payment === "pix" ? "selected" : ""}`}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <QrCode size={28} style={{ color: "#C89B3C" }} />
            </div>
            <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 4 }}>PIX</div>
            <div style={{ fontSize: 11, color: "#5A6B2A", fontWeight: 700, marginBottom: 2 }}>{pixDiscountPercentLabel} de desconto</div>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Chave: 41999154720</div>
            <div className="option-check">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>

          {/* Maquininha */}
          <button
            type="button"
            onClick={() => setPayment("card")}
            className={`option-card ${payment === "card" ? "selected" : ""}`}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <CreditCard size={28} style={{ color: "#C89B3C" }} />
            </div>
            <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 4 }}>Maquininha</div>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Na entrega/retirada</div>
            <div className="option-check">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Secao: Resumo */}
      <div className="card-white">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#C89B3C",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-montserrat, Montserrat)" }}>4</span>
          </div>
          <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 15, color: "#1A1A1A" }}>
            Resumo do pedido
          </span>
        </div>

        {/* Badge desconto PIX */}
        {payment === "pix" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#F0F4E8", borderRadius: 10, padding: "10px 14px",
            marginBottom: 16,
          }}>
            <Check size={16} style={{ color: "#5A6B2A" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#5A6B2A" }}>Desconto de {pixDiscountPercentLabel} aplicado!</span>
          </div>
        )}

        {/* Lista de itens */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {cartItems.map(item => (
            <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#444" }}>
              <span style={{ fontWeight: 500 }}>
                {item.quantity}x {item.product.name}
              </span>
              <span style={{ fontWeight: 600, color: "#1A1A1A" }}>
                {formatCurrency(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totais */}
        <div style={{ borderTop: "1.5px dashed #E5E0D8", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666" }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{formatCurrency(subtotal)}</span>
          </div>
          {delivery === "delivery" && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666" }}>
              <span>Frete</span>
              <span style={{ fontWeight: 600, color: "#1A1A1A" }}>+ {formatCurrency(deliveryFee)}</span>
            </div>
          )}
          {payment === "pix" && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5A6B2A" }}>
              <span>Desconto PIX ({pixDiscountPercentLabel})</span>
              <span style={{ fontWeight: 700 }}>- {formatCurrency(pixDiscount)}</span>
            </div>
          )}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderTop: "1px solid #E5E0D8", paddingTop: 12, marginTop: 4,
          }}>
            <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 16, color: "#1A1A1A" }}>Total</span>
            <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 900, fontSize: 22, color: "#C89B3C" }}>
              {formatCurrency(finalTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Erro de submit */}
      {submitError && (
        <div style={{
          background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12,
          padding: "12px 16px", fontSize: 14, color: "#DC2626", fontWeight: 500,
        }}>
          {submitError}
        </div>
      )}

      {/* Botao WhatsApp */}
      <button
        type="button"
        disabled={loading || cartItems.length === 0 || !isFormValid()}
        onClick={handleSubmit}
        className="btn-primary whatsapp-btn"
        style={{
          height: 60, fontSize: 16,
          opacity: loading || cartItems.length === 0 || !isFormValid() ? 0.65 : 1,
          cursor: loading || cartItems.length === 0 || !isFormValid() ? "not-allowed" : "pointer",
        }}
      >
        {loading ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
            </svg>
            Enviando pedido...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L.057 23.17a.75.75 0 00.923.923l5.333-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.63-.485-5.163-1.336l-.37-.215-3.836 1.055 1.055-3.836-.215-.37A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Confirmar e Abrir WhatsApp
          </>
        )}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", marginTop: -8 }}>
        O WhatsApp da Donna FIT sera aberto com seu pedido formatado.
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Modal de tipo de arroz */}
      {showRiceModal && (
        <>
          <div
            onClick={() => setShowRiceModal(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div style={{
            position: "fixed", inset: 0, zIndex: 201,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
            pointerEvents: "none",
          }}>
            <div data-testid="rice-modal" style={{
              background: "#fff", borderRadius: 24,
              padding: "28px 24px",
              width: "100%", maxWidth: 440,
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              pointerEvents: "auto",
            }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "#F0F4E8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                }}>
                  <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#5A6B2A" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V11m0 0C7 11 4 8 4 4c0 0 4 0 8 4zm0 0c5 0 8-3 8-7 0 0-4 0-8 4z"/>
                  </svg>
                </div>
                <h2 style={{
                  fontFamily: "var(--font-montserrat, Montserrat)",
                  fontWeight: 900, fontSize: 20, color: "#1A1A1A", margin: "0 0 6px",
                }}>
                  Tipo de Arroz
                </h2>
                <p style={{ fontSize: 13, color: "#888", margin: 0, fontFamily: "var(--font-switzer), sans-serif" }}>
                  {riceMode === "same" ? "Vale para todas as marmitas do pedido" : "Escolha para cada item com arroz"}
                </p>
              </div>

              {/* Items */}
              {riceMode === "same" ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {(["integral", "branco"] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSameRiceType(type)}
                        style={{
                          padding: "16px 8px",
                          borderRadius: 12,
                          border: `2px solid ${sameRiceType === type ? "#5A6B2A" : "transparent"}`,
                          background: sameRiceType === type ? "#5A6B2A" : "#F0EDE8",
                          color: sameRiceType === type ? "#fff" : "#666",
                          fontFamily: "var(--font-switzer), sans-serif",
                          fontWeight: 700, fontSize: 14,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {type === "integral" ? "Integral" : "Branco"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={switchToIndividualRice}
                    style={{
                      display: "block", width: "100%", textAlign: "center",
                      background: "none", border: "none", marginTop: 14,
                      color: "#5A6B2A", fontSize: 12.5, fontWeight: 700,
                      cursor: "pointer", padding: "4px", textDecoration: "underline",
                      fontFamily: "var(--font-switzer), sans-serif",
                    }}
                  >
                    Prefiro escolher item por item
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
                  {riceItems.map(item => (
                    <div
                      key={item.product.id}
                      style={{
                        background: "#FAFAF8", borderRadius: 14,
                        padding: "14px 16px",
                        border: `1.5px solid ${riceChoices[item.product.id] ? "#5A6B2A" : "#E5E0D8"}`,
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      <p style={{
                        fontFamily: "var(--font-switzer), sans-serif",
                        fontWeight: 700, fontSize: 14, color: "#1A1A1A",
                        margin: "0 0 10px",
                      }}>
                        {item.quantity}x {item.product.name}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {(["integral", "branco"] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setRiceChoices(prev => ({ ...prev, [item.product.id]: type }))}
                            style={{
                              padding: "10px 8px",
                              borderRadius: 10,
                              border: `2px solid ${riceChoices[item.product.id] === type ? "#5A6B2A" : "transparent"}`,
                              background: riceChoices[item.product.id] === type ? "#5A6B2A" : "#F0EDE8",
                              color: riceChoices[item.product.id] === type ? "#fff" : "#666",
                              fontFamily: "var(--font-switzer), sans-serif",
                              fontWeight: 700, fontSize: 13,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {type === "integral" ? "Integral" : "Branco"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRiceMode("same")}
                    style={{
                      display: "block", width: "100%", textAlign: "center",
                      background: "none", border: "none", marginTop: 2,
                      color: "#999", fontSize: 12.5, fontWeight: 600,
                      cursor: "pointer", padding: "4px", textDecoration: "underline",
                      fontFamily: "var(--font-switzer), sans-serif",
                    }}
                  >
                    Voltar para escolha única
                  </button>
                </div>
              )}

              {/* Botões */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  disabled={!allRiceChosen}
                  onClick={() => { setShowRiceModal(false); void doSubmit() }}
                  style={{
                    width: "100%", height: 52, borderRadius: 14,
                    background: allRiceChosen ? "#C89B3C" : "#E5E0D8",
                    color: allRiceChosen ? "#fff" : "#aaa",
                    border: "none",
                    fontFamily: "var(--font-montserrat, Montserrat)",
                    fontWeight: 800, fontSize: 15,
                    cursor: allRiceChosen ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                >
                  Confirmar e Finalizar Pedido
                </button>
                <button
                  type="button"
                  onClick={() => setShowRiceModal(false)}
                  style={{
                    background: "none", border: "none",
                    color: "#999", fontSize: 13,
                    cursor: "pointer", padding: "6px",
                    fontFamily: "var(--font-switzer), sans-serif",
                  }}
                >
                  Voltar ao checkout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
