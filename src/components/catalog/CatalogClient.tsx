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
  const [active, setActive] = useState("all")

  const filtered = useMemo(
    () =>
      active === "all"
        ? products
        : products.filter((p) => p.categories?.slug === active),
    [active, products]
  )

  return (
    <div className="space-y-4">
      <CategoryFilter
        categories={categories}
        active={active}
        onChange={setActive}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm col-span-2 text-center py-8">
            Nenhum item nesta categoria.
          </p>
        )}
      </div>
    </div>
  )
}
