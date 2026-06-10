"use client"
import { useState } from "react"
import Image from "next/image"
import { BookOpen, Search } from "lucide-react"

interface ProductWithCategory {
  id: string
  name: string
  description: string | null
  prep_instructions: string | null
  image_url: string | null
  price: number
  sku: string | null
  categories: { name: string; slug: string } | null
}

interface Props {
  products: ProductWithCategory[]
}

export function ManualClient({ products }: Props) {
  const [selected, setSelected] = useState<ProductWithCategory | null>(products[0] ?? null)
  const [search, setSearch] = useState("")

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.categories?.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
  const grouped = filtered.reduce<Record<string, ProductWithCategory[]>>((acc, p) => {
    const cat = p.categories?.name ?? "Sem categoria"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div className="min-h-full" style={{ background: "#F3F4F6" }}>
      {/* Topbar */}
      <div className="sticky top-0 z-30 px-6 py-4 flex items-center gap-3" style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}>
        <BookOpen className="h-5 w-5" style={{ color: "#C89B3C" }} />
        <div>
          <h1 className="font-black text-gray-900" style={{ fontFamily: "var(--font-montserrat)", fontSize: 18 }}>Manual de Preparo</h1>
          <p className="text-xs text-gray-500 mt-0.5">{products.length} produtos cadastrados</p>
        </div>
      </div>

      <div className="flex" style={{ height: "calc(100vh - 65px)" }}>
        {/* Left column — product list */}
        <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 300, background: "#fff", borderRight: "1px solid #E5E7EB" }}>
          {/* Search */}
          <div className="p-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-yellow-400"
                style={{ background: "#F9FAFB" }}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400" style={{ background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                  {cat}
                </div>
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background: selected?.id === p.id ? "rgba(200,155,60,0.08)" : "transparent",
                      borderBottom: "1px solid #F9FAFB",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <BookOpen className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{p.name}</p>
                      {p.sku && <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>}
                    </div>
                    {selected?.id === p.id && (
                      <div className="w-1 h-6 rounded-full shrink-0" style={{ background: "#C89B3C" }} />
                    )}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column — detail */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: "#F9FAFB" }}>
          {selected ? (
            <div className="max-w-2xl">
              {/* Image */}
              {selected.image_url && (
                <div className="w-full rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: "16/7" }}>
                  <Image
                    src={selected.image_url}
                    alt={selected.name}
                    width={800}
                    height={350}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Header */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="font-black text-gray-900" style={{ fontFamily: "var(--font-montserrat)", fontSize: 22 }}>{selected.name}</h2>
                  {selected.categories?.name && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full shrink-0" style={{ background: "rgba(200,155,60,0.12)", color: "#C89B3C" }}>
                      {selected.categories.name}
                    </span>
                  )}
                </div>
                {selected.sku && (
                  <p className="text-xs text-gray-400 mb-2">Código: {selected.sku}</p>
                )}
              </div>

              {/* Prep Instructions */}
              {selected.prep_instructions ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(200,155,60,0.12)" }}>
                      <BookOpen className="h-4 w-4" style={{ color: "#C89B3C" }} />
                    </div>
                    <h3 className="font-bold text-gray-800" style={{ fontFamily: "var(--font-montserrat)", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Modo de Preparo
                    </h3>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {selected.prep_instructions}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center mb-4">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400 text-sm">Nenhuma instrução de preparo cadastrada.</p>
                </div>
              )}

              {/* Description */}
              {selected.description && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Descrição / Ingredientes</h3>
                  <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {selected.description}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <BookOpen className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Selecione um produto</p>
              <p className="text-sm mt-1">Clique em um item na lista ao lado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
