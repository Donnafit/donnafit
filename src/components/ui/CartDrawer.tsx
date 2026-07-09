"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/hooks/useCart"
import { useAuth } from "@/hooks/useAuth"
import { formatCurrency, resolveImageSrc } from "@/lib/utils"

function CartItemImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [imgSrc, setImgSrc] = useState(resolveImageSrc(src))
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      onError={() => { if (imgSrc !== "/marmita.jpg") setImgSrc("/marmita.jpg") }}
    />
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, updateQuantity, removeItem, total } = useCart()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  function handleFinalize() {
    if (loading) return // aguarda useAuth resolver antes de decidir o destino
    if (!user) {
      try { localStorage.setItem("donna-fit-checkout-intent", "1") } catch {}
      onClose()
      window.dispatchEvent(new CustomEvent("openProfileModal"))
    } else {
      onClose()
      router.push("/checkout")
    }
  }

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const displayItems = mounted ? items : []
  const totalAmount = mounted ? total() : 0
  const itemCount = displayItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(3px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        data-testid="cart-drawer"
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "min(420px, 100vw)",
          background: "#FAFAF8",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          zIndex: 151,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #F0EDE8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fff", flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 18, color: "#1A1A1A", margin: 0 }}>
              Meu Carrinho
            </h2>
            {itemCount > 0 && (
              <p style={{ fontSize: 12, color: "#999", margin: "2px 0 0", fontFamily: "var(--font-switzer), sans-serif" }}>
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#F5F0E8", border: "none",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", color: "#666",
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Empty state */}
        {displayItems.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "#F0F4E8", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#B0C070" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, fontSize: 16, color: "#1A1A1A", margin: "0 0 8px" }}>
                Seu carrinho está vazio
              </p>
              <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#AAA", margin: 0, lineHeight: 1.5 }}>
                Adicione marmitas e combos<br />deliciosos para continuar
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "#5A6B2A", color: "#fff",
                border: "none", borderRadius: 12,
                padding: "12px 28px",
                fontFamily: "var(--font-switzer), sans-serif",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Ver Cardápio
            </button>
          </div>
        )}

        {/* Items */}
        {displayItems.length > 0 && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {displayItems.map((item) => (
              <div
                key={item.product.id}
                style={{
                  background: "#fff", borderRadius: 16,
                  padding: "13px", marginBottom: 10,
                  display: "flex", gap: 12, alignItems: "flex-start",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                }}
              >
                {/* ── Coluna 1: Foto ── */}
                <div style={{
                  width: 68, height: 68, borderRadius: 12,
                  overflow: "hidden", flexShrink: 0, background: "#F5F0E8",
                }}>
                  <CartItemImage src={item.product.image_url} alt={item.product.name} />
                </div>

                {/* ── Coluna 2: Info ── */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Linha 1: Título */}
                  <p style={{
                    fontFamily: "var(--font-switzer), sans-serif",
                    fontWeight: 700, fontSize: 15, color: "#1A1A1A",
                    margin: 0, lineHeight: 1.35,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}>
                    {item.product.name}
                  </p>

                  {/* Linha 2: Preço (esq) + Controles (dir) */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Preço */}
                    <span style={{
                      fontFamily: "var(--font-switzer), sans-serif",
                      fontWeight: 900, fontSize: 17, color: "#C89B3C", lineHeight: 1,
                    }}>
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>

                    {/* Controles */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ display: "inline-flex", background: "#F5F2EE", borderRadius: 100, padding: 2 }}>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          aria-label="Remover um"
                          style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}
                        >
                          <svg width="10" height="2" viewBox="0 0 10 2" fill="none"><rect x="0" y="0.5" width="10" height="1" rx="0.5" fill="#1A1A1A"/></svg>
                        </button>
                        <span style={{ minWidth: 22, textAlign: "center", fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 13, color: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          aria-label="Adicionar mais um"
                          style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "linear-gradient(135deg, #5A6B2A, #7B9238)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(90,107,42,0.35)" }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        title="Remover item"
                        style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {displayItems.length > 0 && (
          <div style={{
            padding: "16px 20px",
            borderTop: "1px solid #F0EDE8",
            background: "#fff", flexShrink: 0,
            paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#888" }}>Subtotal</span>
              <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 22, color: "#1A1A1A" }}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#888" }}>Entrega</span>
              <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#5A6B2A", fontWeight: 600 }}>a calcular</span>
            </div>

            {/* PIX hint */}
            <div style={{
              background: "#F0F4E8", borderRadius: 10,
              padding: "9px 14px", marginBottom: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#5A6B2A" strokeWidth={2} style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 11, color: "#5A6B2A", fontWeight: 600 }}>
                Pague no PIX e ganhe 5% de desconto
              </span>
            </div>

            <button
              onClick={handleFinalize}
              style={{
                width: "100%", padding: "15px",
                background: "#C89B3C", color: "#fff",
                border: "none", borderRadius: 14,
                fontFamily: "var(--font-switzer), sans-serif",
                fontWeight: 800, fontSize: 15,
                cursor: "pointer", transition: "all 0.18s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#B8892C"
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(200,155,60,0.35)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#C89B3C"
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              Finalizar Pedido
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
