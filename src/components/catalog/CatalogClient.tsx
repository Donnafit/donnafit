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
  // null = todos; string = category id
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
      <div style={{ padding: "32px 20px 120px", maxWidth: 1200, margin: "0 auto" }}>
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "#999",
              fontSize: 14,
              padding: "80px 20px",
            }}
          >
            Nenhum item nesta categoria.
          </p>
        )}
      </div>
    </div>
  )
}
