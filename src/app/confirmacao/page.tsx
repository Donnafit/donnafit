"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

type OrderSummary = {
  items: { name: string; qty: number; price: number }[]
  deliveryType: "pickup" | "delivery"
  paymentMethod: "pix" | "card"
  total: number
}

function ConfirmacaoContent() {
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState<string>("")
  const [whatsappUrl, setWhatsappUrl] = useState<string>("https://wa.me/5541999154720")
  const [summary, setSummary] = useState<OrderSummary | null>(null)

  useEffect(() => {
    const fromUrl = searchParams.get("order") || searchParams.get("id")
    if (fromUrl) {
      setOrderNumber(fromUrl)
      try { localStorage.setItem("donna-fit-last-order", fromUrl) } catch {}
    } else {
      try {
        const stored = localStorage.getItem("donna-fit-last-order")
        if (stored) setOrderNumber(stored)
      } catch {}
    }
    const waParam = searchParams.get("wa")
    if (waParam) {
      setWhatsappUrl(decodeURIComponent(waParam))
    }
    try {
      const raw = localStorage.getItem("donna-fit-order-summary")
      if (raw) setSummary(JSON.parse(raw))
    } catch {}
  }, [searchParams])

  useEffect(() => {
    const container = document.getElementById("confetti-container")
    if (!container) return
    const colors = ["#C89B3C", "#5A6B2A", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"]
    for (let i = 0; i < 40; i++) {
      const el = document.createElement("div")
      el.className = "confetti-piece"
      el.style.left = Math.random() * 100 + "vw"
      el.style.width = (6 + Math.random() * 8) + "px"
      el.style.height = (6 + Math.random() * 8) + "px"
      el.style.background = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px"
      el.style.animationDuration = (2 + Math.random() * 3) + "s"
      el.style.animationDelay = (Math.random() * 1.5) + "s"
      container.appendChild(el)
    }
    const timer = setTimeout(() => { if (container) container.innerHTML = "" }, 6000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      {/* Confetti container */}
      <div id="confetti-container" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 }} />

      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>

        {/* Success icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div
            className="success-pulse scale-in"
            style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "#5A6B2A",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path className="check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "var(--font-montserrat, Montserrat)",
          fontWeight: 900, fontSize: 28, color: "#1A1A1A", marginBottom: 10,
        }}>
          Pedido Confirmado!
        </h1>

        {/* Subtitles */}
        <p style={{ color: "#444", fontSize: 15, marginBottom: 4, lineHeight: 1.5 }}>
          Recebemos seu pedido e ja estamos preparando tudo.
        </p>
        <p style={{ color: "#999", fontSize: 13, marginBottom: 28, lineHeight: 1.5 }}>
          Em breve nossa equipe entrara em contato.
        </p>

        {/* Order number card */}
        <div style={{
          background: "#fff",
          border: "2px dashed #C89B3C",
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "#aaa",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
          }}>
            Numero do Pedido
          </div>
          <div style={{
            fontFamily: "var(--font-montserrat, Montserrat)",
            fontWeight: 900, fontSize: 32, color: "#C89B3C",
          }}>
            {orderNumber ? `#${orderNumber}` : "—"}
          </div>
          {orderNumber && (
            <span style={{
              display: "inline-block", marginTop: 8,
              background: "#FFF3D4", color: "#C89B3C",
              borderRadius: 100, padding: "4px 14px",
              fontSize: 12, fontWeight: 700,
            }}>
              #{orderNumber}
            </span>
          )}
        </div>

        {/* Resumo do Pedido card */}
        {summary && (
          <div style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
            padding: 20,
            marginBottom: 20,
            textAlign: "left",
          }}>
            <h2 style={{
              fontFamily: "var(--font-montserrat, Montserrat)",
              fontWeight: 800, fontSize: 16, color: "#1A1A1A", marginBottom: 16,
            }}>
              Resumo do Pedido
            </h2>

            {/* Items list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {summary.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#444" }}>
                  <span style={{ fontWeight: 500 }}>{item.qty}x {item.name}</span>
                  <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>

            {/* Dashed divider + delivery / payment rows */}
            <div style={{ borderTop: "1.5px dashed #E5E0D8", paddingTop: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666" }}>
                <span>Entrega</span>
                <span style={{ fontWeight: 600, color: "#1A1A1A" }}>
                  {summary.deliveryType === "pickup" ? "Retirada na loja" : "Entrega (R$ 5,00)"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666" }}>
                <span>Pagamento</span>
                <span style={{ fontWeight: 600, color: "#1A1A1A" }}>
                  {summary.paymentMethod === "pix" ? "PIX (5% desconto)" : "Maquininha"}
                </span>
              </div>
            </div>

            {/* Total */}
            <div style={{ borderTop: "1.5px dashed #E5E0D8", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 15, color: "#1A1A1A" }}>
                Total
              </span>
              <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 900, fontSize: 22, color: "#C89B3C" }}>
                {formatCurrency(summary.total)}
              </span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary whatsapp-btn"
            style={{ textDecoration: "none", height: 56, fontSize: 15 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L.057 23.17a.75.75 0 00.923.923l5.333-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.63-.485-5.163-1.336l-.37-.215-3.836 1.055 1.055-3.836-.215-.37A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Acompanhar no WhatsApp
          </a>

          <Link href="/" className="btn-outline" style={{ textDecoration: "none" }}>
            Fazer novo pedido
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={
      <div style={{
        background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)",
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "4px solid #C89B3C", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ConfirmacaoContent />
    </Suspense>
  )
}
