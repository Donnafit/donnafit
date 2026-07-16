"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

type OrderSummary = {
  items: { name: string; qty: number; price: number }[]
  deliveryType: "pickup" | "delivery"
  deliveryFee?: number
  paymentMethod: "pix" | "card" | "card_link"
  pixDiscountPercentLabel?: string
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
    if (waParam) setWhatsappUrl(waParam)
    try {
      const raw = localStorage.getItem("donna-fit-order-summary")
      if (raw) setSummary(JSON.parse(raw))
    } catch {}
  }, [searchParams])

  useEffect(() => {
    const container = document.getElementById("confetti-container")
    if (!container) return
    const colors = ["#C89B3C", "#5A6B2A", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"]
    for (let i = 0; i < 80; i++) {
      const el = document.createElement("div")
      el.className = "confetti-piece"
      el.style.left = Math.random() * 100 + "vw"
      el.style.width = (6 + Math.random() * 8) + "px"
      el.style.height = (6 + Math.random() * 8) + "px"
      el.style.background = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px"
      el.style.animationDuration = (2 + Math.random() * 3) + "s"
      el.style.animationDelay = (Math.random() * 2) + "s"
      container.appendChild(el)
    }
    const timer = setTimeout(() => { if (container) container.innerHTML = "" }, 7000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)",
      minHeight: "100vh",
    }}>
      {/* Confetti */}
      <div
        id="confetti-container"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}
      />

      <div style={{ maxWidth: 540, margin: "0 auto", width: "100%", padding: "48px 20px 80px", textAlign: "center" }}>

        {/* Ícone sucesso */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div
            className="success-pulse scale-in"
            style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "#5A6B2A",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path className="check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 style={{
          fontFamily: "var(--font-montserrat, Montserrat)",
          fontWeight: 900, fontSize: 30, color: "#1A1A1A", marginBottom: 10,
        }}>
          Pedido Confirmado!
        </h1>

        {/* Subtítulos */}
        <p style={{ color: "#666", fontSize: 15, lineHeight: 1.6, marginBottom: 6 }}>
          Recebemos seu pedido e já<br />estamos preparando tudo.
        </p>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 28 }}>
          Em breve nossa equipe entrará em contato. 💚
        </p>

        {/* Card número do pedido */}
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
            Número do Pedido
          </div>
          <div style={{
            fontFamily: "var(--font-montserrat, Montserrat)",
            fontWeight: 900, fontSize: 32, color: "#C89B3C", letterSpacing: 1,
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

        {/* Resumo do Pedido */}
        {summary && (
          <div style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
            padding: 20,
            textAlign: "left",
            marginBottom: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{
                fontFamily: "var(--font-montserrat, Montserrat)",
                fontWeight: 800, fontSize: 15, color: "#1A1A1A", margin: 0,
              }}>
                Resumo do Pedido
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, fontSize: 14, color: "#555" }}>
              {summary.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{item.qty}x {item.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1.5px dashed #E5E0D8", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
                <span>Entrega</span>
                <span style={{ fontWeight: 600, color: "#1A1A1A" }}>
                  {summary.deliveryType === "pickup"
                    ? "Retirada na loja"
                    : `Entrega (${formatCurrency(summary.deliveryFee ?? 0)})`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
                <span>Pagamento</span>
                <span style={{ fontWeight: 600, color: "#1A1A1A" }}>
                  {summary.paymentMethod === "pix"
                    ? `PIX (${summary.pixDiscountPercentLabel ?? "2%"} desconto)`
                    : summary.paymentMethod === "card_link"
                      ? "Cartão (link de pagamento)"
                      : "Maquininha"}
                </span>
              </div>
              <div style={{ borderTop: "1.5px dashed #E5E0D8", paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 16, color: "#1A1A1A" }}>
                  Total
                </span>
                <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 900, fontSize: 22, color: "#C89B3C" }}>
                  {formatCurrency(summary.total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn"
            style={{
              textDecoration: "none",
              width: "100%", height: 56,
              borderRadius: 14,
              fontFamily: "var(--font-montserrat, Montserrat)",
              fontWeight: 800, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: "0 6px 20px rgba(37, 211, 102, 0.35)",
              border: "none", cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
