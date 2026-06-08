"use client"

import { useState, useMemo } from "react"
import { CategoryFilter } from "./CategoryFilter"
import { ProductCard } from "./ProductCard"
import type { Category, Product } from "@/types"

interface ProductWithCategory extends Product {
  categories: { name: string; slug: string } | null
}

interface Props {
  categories: Category[]
  products: ProductWithCategory[]
}

export function CatalogClient({ categories, products }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      activeCategory === null
        ? products
        : products.filter((p) => p.category_id === activeCategory),
    [activeCategory, products]
  )

  return (
    <div>
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <div style={{ paddingTop: 28, paddingBottom: 100 }}>
        {/* Section header */}
        <div className="section-header">
          <h2 className="section-title">
            Nosso Cardápio
            <span className="section-count">{filtered.length}</span>
          </h2>
        </div>

        {/* Grid */}
        <div className="product-grid">
          {filtered.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#F5F0E8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#C89B3C" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <p style={{ color: "#999", fontSize: 14, fontWeight: 500 }}>
              Nenhum item nesta categoria.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
