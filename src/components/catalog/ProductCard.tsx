"use client"

import { useState } from "react"
import Image from "next/image"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import type { Product } from "@/types"
import { Star } from "lucide-react"
import { StockBadge } from "./StockBadge"

interface ProductWithCategory extends Product {
  categories?: { name: string; slug: string } | null
}

interface Props {
  product: ProductWithCategory
  index?: number
}

export function ProductCard({ product, index }: Props) {
  const { items, addItem, updateQuantity } = useCart()
  const cartItem = items.find((i) => i.product.id === product.id)
  const qty = cartItem?.quantity ?? 0
  const soldOut = !product.is_active || product.stock_quantity <= 0

  const [addFeedback, setAddFeedback] = useState(false)

  function handleAdd() {
    addItem(product)
    setAddFeedback(true)
    setTimeout(() => setAddFeedback(false), 1000)
  }

  const categoryName = product.categories?.name ?? null

  return (
    <div
      className={`product-card fade-in-up${soldOut ? " opacity-60" : ""}`}
      style={{
        animationDelay: index !== undefined ? `${index * 0.05}s` : undefined,
      }}
    >
      {/* Badge "Mais Pedido" — canto superior direito */}
      {product.sort_order === 0 && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 5,
            background: "#C89B3C",
            color: "white",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 10,
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: 100,
            boxShadow: "0 2px 8px rgba(200,155,60,0.5)",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Star size={10} style={{ fill: "currentColor" }} /> Mais Pedido
        </div>
      )}

      {/* Badge de categoria — canto superior esquerdo */}
      {categoryName && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 5,
          }}
        >
          <span
            style={{
              background: "rgba(26,26,26,0.65)",
              color: "white",
              backdropFilter: "blur(6px)",
              borderRadius: 100,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {categoryName}
          </span>
        </div>
      )}

      {/* Imagem */}
      <div style={{ overflow: "hidden", position: "relative" }}>
        <Image
          src={product.image_url ?? "/marmita.jpg"}
          alt={product.name}
          width={400}
          height={160}
          className="product-img"
          style={{ width: "100%", height: 190, objectFit: "cover" }}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            img.src = "/marmita.jpg"
          }}
        />
        {/* Badge de estoque — inferior direito da imagem */}
        {(soldOut || product.stock_quantity <= product.min_stock_alert) && (
          <div style={{ position: "absolute", bottom: 8, right: 8, zIndex: 5 }}>
            <StockBadge
              stockQuantity={product.stock_quantity}
              minAlert={product.min_stock_alert}
              isActive={product.is_active}
            />
          </div>
        )}
      </div>

      {/* Conteudo */}
      <div
        style={{
          padding: 16,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Nome */}
        <h3
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: "#1A1A1A",
            lineHeight: 1.3,
            marginBottom: 6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.name}
        </h3>

        {/* Descricao */}
        {product.description && (
          <p
            style={{
              fontSize: 12,
              color: "#888",
              lineHeight: 1.5,
              flex: 1,
              marginBottom: 12,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.description}
          </p>
        )}

        {/* Row preco + controles */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTop: "1px solid #F5F0E8",
            marginTop: "auto",
          }}
        >
          {/* Preco */}
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: 18,
              color: "#C89B3C",
            }}
          >
            {formatCurrency(product.price)}
          </span>

          {/* Controles */}
          {soldOut ? (
            <button
              disabled
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "#E5E0D8", color: "#999",
                border: "none", cursor: "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
              aria-label="Produto esgotado"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </button>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={addFeedback}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: addFeedback ? "#C89B3C" : "#5A6B2A",
                color: "white",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s ease, transform 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!addFeedback) {
                  const btn = e.currentTarget as HTMLButtonElement
                  btn.style.background = "#4A5B1A"
                  btn.style.transform = "scale(1.1)"
                }
              }}
              onMouseLeave={(e) => {
                if (!addFeedback) {
                  const btn = e.currentTarget as HTMLButtonElement
                  btn.style.background = "#5A6B2A"
                  btn.style.transform = "scale(1)"
                }
              }}
              aria-label="Adicionar ao carrinho"
            >
              {addFeedback ? (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              )}
            </button>
          ) : (
            <div
              style={{
                display: "inline-flex",
                border: "1.5px solid #E5E0D8",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <button
                className="qty-btn"
                style={{ borderRadius: 0 }}
                onClick={() => updateQuantity(product.id, qty - 1)}
                aria-label="Remover um"
              >
                &minus;
              </button>
              <span
                style={{
                  minWidth: 36,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {qty}
              </span>
              <button
                className="qty-btn"
                style={{ borderRadius: 0 }}
                onClick={() => addItem(product)}
                aria-label="Adicionar mais um"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
