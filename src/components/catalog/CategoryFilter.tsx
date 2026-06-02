"use client"
import type { Category } from "@/types"

interface Props {
  categories: Category[]
  active: string
  onChange: (slug: string) => void
}

export function CategoryFilter({ categories, active, onChange }: Props) {
  const all = [{ id: "all", slug: "all", name: "Todos" }, ...categories]

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="flex gap-2 w-max">
        {all.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onChange(cat.slug)}
            className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
              active === cat.slug
                ? "bg-brand-gold text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  )
}
