"use client"

import { useState } from "react"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import type { Product } from "@/types"

interface ProductWithCategory extends Product {
  categories?: { name: string; slug: string } | null
}

export function ProductDetailClient({ product }: { product: ProductWithCategory }) {
  const { items, addItem, updateQuantity } = useCart()
  const cartItem = items.find((i) => i.product.id === product.id)
  const qty = cartItem?.quantity ?? 0
  const soldOut = !product.is_active || product.stock_quantity <= 0
  const [added, setAdded] = useState(false)

  function handleAdd() {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div style={{ padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {/* Nome */}
      <h1
        style={{
          fontFamily: "var(--font-montserrat)",
          fontWeight: 900,
          fontSize: "clamp(20px, 3vw, 28px)",
          color: "#1A1A1A",
          lineHeight: 1.25,
          marginBottom: 12,
        }}
      >
        {product.name}
      </h1>

      {/* Descrição curta */}
      {product.description && (
        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.65, marginBottom: 24 }}>
          {product.description.slice(0, 120)}
          {product.description.length > 120 ? "…" : ""}
        </p>
      )}

      {/* Divider */}
      <div style={{ borderTop: "1px solid #F0EDE8", marginBottom: 24 }} />

      {/* Preço */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 28 }}>
        <span
          style={{
            fontFamily: "var(--font-montserrat)",
            fontWeight: 900,
            fontSize: 32,
            color: "#C89B3C",
            lineHeight: 1,
          }}
        >
          {formatCurrency(product.price)}
        </span>
        {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
          <span style={{ fontSize: 12, color: "#E05252", fontWeight: 600, fontFamily: "var(--font-montserrat)" }}>
            Últimas {product.stock_quantity} unidades!
          </span>
        )}
      </div>

      {/* Botão / Quantidade */}
      {soldOut ? (
        <div
          style={{
            background: "#F5F0E8",
            color: "#999",
            textAlign: "center",
            padding: "16px",
            borderRadius: 14,
            fontSize: 14,
            fontFamily: "var(--font-montserrat)",
            fontWeight: 600,
          }}
        >
          Esgotado no momento
        </div>
      ) : qty === 0 || added ? (
        <button
          onClick={handleAdd}
          style={{
            padding: "16px 28px",
            background: added
              ? "linear-gradient(135deg, #C89B3C, #E8B84D)"
              : "linear-gradient(135deg, #5A6B2A, #7B9238)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontFamily: "var(--font-montserrat)",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: added ? "0 6px 20px rgba(200,155,60,0.4)" : "0 6px 20px rgba(90,107,42,0.35)",
            transition: "all 0.25s ease",
            transform: added ? "scale(0.97)" : "scale(1)",
            minHeight: 52,
          }}
        >
          {added ? (
            <>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Adicionado!
            </>
          ) : (
            <>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Adicionar ao carrinho
            </>
          )}
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#F5F2EE",
              borderRadius: 100,
              padding: "4px",
            }}
          >
            <button
              onClick={() => updateQuantity(product.id, qty - 1)}
              aria-label="Remover um"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                background: "#fff",
                color: "#1A1A1A",
                cursor: "pointer",
                fontSize: 20,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              }}
            >
              &minus;
            </button>
            <span
              style={{
                minWidth: 40,
                textAlign: "center",
                fontFamily: "var(--font-montserrat)",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {qty}
            </span>
            <button
              onClick={() => addItem(product)}
              aria-label="Adicionar mais um"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                background: "linear-gradient(135deg, #5A6B2A, #7B9238)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 20,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(90,107,42,0.35)",
              }}
            >
              +
            </button>
          </div>
          <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>
            {formatCurrency(product.price * qty)} no carrinho
          </span>
        </div>
      )}

      {/* Info de entrega */}
      <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontFamily: "var(--font-montserrat)" }}>Produzido fresco diariamente</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 3h15l3 9H4L1 3zm0 0H0M4 12l-1 7h18M9 19a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <span style={{ fontFamily: "var(--font-montserrat)" }}>Retirada ou delivery disponível</span>
        </div>
      </div>
    </div>
  )
}
