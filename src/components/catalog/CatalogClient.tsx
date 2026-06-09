"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import { CategoryFilter } from "./CategoryFilter"
import { ProductCard } from "./ProductCard"
import type { Category, Product } from "@/types"

interface ProductWithCategory extends Product {
  categories: { name: string; slug: string } | null
}

interface Props {
  categories: Category[]
  products: ProductWithCategory[]
  initialCategory?: string | null
}

export function CatalogClient({ categories, products, initialCategory }: Props) {
  const resolveId = (slug: string | null | undefined) =>
    slug ? (categories.find((c) => c.slug === slug)?.id ?? null) : null

  const [activeCategory, setActiveCategory] = useState<string | null>(() =>
    resolveId(initialCategory)
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setActiveCategory(resolveId(initialCategory))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory])

  function handleSelect(id: string | null) {
    startTransition(() => {
      setActiveCategory(id)
    })
  }

  const filtered = useMemo(
    () =>
      activeCategory === null
        ? products
        : products.filter((p) => p.category_id === activeCategory),
    [activeCategory, products]
  )

  const activeCategoryName = activeCategory
    ? (categories.find((c) => c.id === activeCategory)?.name ?? null)
    : null

  return (
    <div>
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onSelect={handleSelect}
      />

      <div style={{ padding: "32px 20px 96px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Grid com fade durante transição */}
        <div
          style={{
            opacity: isPending ? 0.45 : 1,
            transition: "opacity 0.18s ease",
            pointerEvents: isPending ? "none" : "auto",
          }}
        >
          {filtered.length > 0 ? (
            <div className="product-grid">
              {filtered.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState categoryName={activeCategoryName} onClear={() => handleSelect(null)} />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  categoryName,
  onClear,
}: {
  categoryName: string | null
  onClear: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      {/* Ilustração SVG minimalista */}
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "rgba(90,107,42,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24,
      }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#5A6B2A" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>

      <h3 style={{
        fontFamily: "var(--font-montserrat, Montserrat)",
        fontWeight: 800, fontSize: 17, color: "#1A1A1A", marginBottom: 8,
      }}>
        {categoryName ? `Sem produtos em "${categoryName}"` : "Nenhum produto encontrado"}
      </h3>

      <p style={{ fontSize: 13, color: "#9E9790", lineHeight: 1.65, maxWidth: 320, marginBottom: 28 }}>
        Ainda não temos itens disponíveis nesta categoria. Confira as outras opções do nosso cardápio.
      </p>

      <button
        onClick={onClear}
        style={{
          background: "linear-gradient(135deg, #5A6B2A, #7B9238)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "12px 28px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "var(--font-montserrat, Montserrat)",
          boxShadow: "0 4px 16px rgba(90,107,42,0.3)",
        }}
      >
        Ver todos os produtos
      </button>
    </div>
  )
}
