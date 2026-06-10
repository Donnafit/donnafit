"use client"

import { useState } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import type { CartItem as CartItemType } from "@/types"

function ProductThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [imgSrc, setImgSrc] = useState<string>(src || "/marmita.jpg")

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      onError={() => {
        if (imgSrc !== "/marmita.jpg") setImgSrc("/marmita.jpg")
      }}
    />
  )
}

export function CartItem({ product, quantity }: CartItemType) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid #F0EDE8",
      }}
    >
      {/* ── Coluna 1: Foto ────── */}
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 12,
          overflow: "hidden",
          flexShrink: 0,
          background: "#F5F2EE",
        }}
      >
        <ProductThumb src={product.image_url} alt={product.name} />
      </div>

      {/* ── Coluna 2: Informações ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Linha 1: Título */}
        <p
          style={{
            fontFamily: "var(--font-switzer), sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "#1A1A1A",
            lineHeight: 1.35,
            margin: 0,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </p>

        {/* Linha 2: Preço (esq) + Controles (dir) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Preço */}
          <span
            style={{
              fontFamily: "var(--font-switzer), sans-serif",
              fontWeight: 900,
              fontSize: 17,
              color: "#C89B3C",
              lineHeight: 1,
            }}
          >
            {formatCurrency(product.price * quantity)}
          </span>

          {/* Controles: stepper + excluir */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Stepper */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#F5F2EE",
                borderRadius: 100,
                padding: "2px",
              }}
            >
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                aria-label="Remover um"
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  border: "none", background: "white", color: "#1A1A1A",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                }}
              >
                <Minus size={11} />
              </button>
              <span
                style={{
                  minWidth: 22, textAlign: "center",
                  fontFamily: "var(--font-switzer), sans-serif",
                  fontWeight: 800, fontSize: 13, color: "#1A1A1A",
                }}
              >
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(product.id, quantity + 1)}
                aria-label="Adicionar mais um"
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  border: "none", background: "linear-gradient(135deg, #5A6B2A, #7B9238)",
                  color: "white", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(90,107,42,0.35)",
                }}
              >
                <Plus size={11} />
              </button>
            </div>

            {/* Excluir */}
            <button
              onClick={() => removeItem(product.id)}
              aria-label="Remover item"
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "none", background: "#FEF2F2", color: "#DC2626",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
