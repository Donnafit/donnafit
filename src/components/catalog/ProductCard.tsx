"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import { StockBadge } from "./StockBadge"
import type { Product } from "@/types"

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
  const [hovered, setHovered] = useState(false)

  function handleAdd() {
    addItem(product)
    setAddFeedback(true)
    setTimeout(() => setAddFeedback(false), 900)
  }

  const categoryName = product.categories?.name ?? null
  const isMostOrdered = product.sort_order === 1

  return (
    <div
      data-product-id={product.id}
      className={`fade-in-up${soldOut ? " opacity-60" : ""}`}
      style={{
        animationDelay: `${(index ?? 0) * 60}ms`,
        background: "#FFFFFF",
        borderRadius: 20,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease",
        boxShadow: hovered
          ? "0 16px 40px rgba(0,0,0,0.14)"
          : "0 2px 16px rgba(0,0,0,0.07)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        border: hovered ? "1.5px solid rgba(200,155,60,0.18)" : "1.5px solid transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Área da imagem ── */}
      <Link href={"/produto/" + product.id} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <Image
          src={product.image_url ?? "/marmita.jpg"}
          alt={product.name}
          width={400}
          height={190}
          style={{
            width: "100%",
            height: 190,
            objectFit: "cover",
            display: "block",
            transition: "transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            transform: hovered ? "scale(1.06)" : "scale(1)",
          }}
          loading="lazy"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = "/marmita.jpg"
          }}
        />

        {/* Gradiente inferior na imagem */}
        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: 72,
            background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Badge categoria — esquerda */}
        {categoryName && (
          <span
            style={{
              position: "absolute",
              top: 10, left: 10,
              background: "rgba(20,20,20,0.55)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color: "rgba(255,255,255,0.92)",
              borderRadius: 100,
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2px",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            {categoryName}
          </span>
        )}

        {/* Badge "Mais Pedido" — direita */}
        {isMostOrdered && (
          <span
            style={{
              position: "absolute",
              top: 10, right: 10,
              background: "linear-gradient(135deg, #C89B3C 0%, #E8B84D 100%)",
              color: "#fff",
              borderRadius: 100,
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 3px 12px rgba(200,155,60,0.5)",
              letterSpacing: "0.2px",
            }}
          >
            ★ Mais Pedido
          </span>
        )}

        {/* Porção — canto inferior direito da imagem */}
        {(product as any).portion_size && (
          <span
            style={{
              position: "absolute",
              bottom: 9, right: 9,
              background: "rgba(255,255,255,0.90)",
              backdropFilter: "blur(6px)",
              borderRadius: 100,
              padding: "3px 9px",
              fontSize: 10,
              fontWeight: 600,
              color: "#5A6B2A",
            }}
          >
            {(product as any).portion_size}
          </span>
        )}
      </div>
      </Link>

      {/* ── Conteúdo ── */}
      <div
        style={{
          padding: "14px 16px 16px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Nome */}
        <Link href={"/produto/" + product.id} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <h3
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: 13.5,
              color: "#1A1A1A",
              lineHeight: 1.38,
              marginBottom: 5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </h3>
        </Link>

        {/* Descrição */}
        {product.description && (
          <p
            style={{
              fontSize: 11.5,
              color: "#9E9790",
              lineHeight: 1.55,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            {product.description}
          </p>
        )}

        {/* ── Preço + botão ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 12,
            borderTop: "1px solid #F0EDE8",
          }}
        >
          {/* Preço */}
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: 17,
              color: "#C89B3C",
              lineHeight: 1,
            }}
          >
            {formatCurrency(product.price)}
          </span>

          {/* Controles */}
          {soldOut ? (
            <StockBadge
              stockQuantity={product.stock_quantity}
              minAlert={(product as any).min_alert ?? 5}
              isActive={product.is_active}
            />
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={addFeedback}
              aria-label="Adicionar ao carrinho"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: addFeedback
                  ? "linear-gradient(135deg, #C89B3C, #E8B84D)"
                  : "linear-gradient(135deg, #5A6B2A, #7B9238)",
                color: "white",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s ease",
                flexShrink: 0,
                boxShadow: addFeedback
                  ? "0 4px 16px rgba(200,155,60,0.45)"
                  : "0 4px 14px rgba(90,107,42,0.38)",
                transform: addFeedback ? "scale(0.94)" : "scale(1)",
              }}
            >
              {addFeedback ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          ) : (
            /* Controle de quantidade */
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#F5F2EE",
                borderRadius: 100,
                padding: "3px",
                gap: 0,
              }}
            >
              <button
                onClick={() => updateQuantity(product.id, qty - 1)}
                aria-label="Remover um"
                style={{
                  width: 30, height: 30,
                  borderRadius: "50%",
                  border: "none",
                  background: "white",
                  color: "#1A1A1A",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                  transition: "opacity 0.15s",
                }}
              >
                &minus;
              </button>
              <span
                style={{
                  minWidth: 30,
                  textAlign: "center",
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#1A1A1A",
                }}
              >
                {qty}
              </span>
              <button
                onClick={() => addItem(product)}
                aria-label="Adicionar mais um"
                style={{
                  width: 30, height: 30,
                  borderRadius: "50%",
                  border: "none",
                  background: "linear-gradient(135deg, #5A6B2A, #7B9238)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1,
                  boxShadow: "0 2px 8px rgba(90,107,42,0.35)",
                  transition: "opacity 0.15s",
                }}
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
