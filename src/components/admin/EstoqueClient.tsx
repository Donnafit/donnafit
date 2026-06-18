"use client"
import { useState, useTransition } from "react"
import Image from "next/image"
import { Package, Search, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ProductWithCat {
  id: string
  name: string
  sku: string | null
  stock_quantity: number
  min_stock_alert: number
  stock_type: "combo" | "avulso"
  image_url: string | null
  categories: { name: string; slug: string } | null
}

interface Props {
  products: ProductWithCat[]
}

function StockBar({ qty, min }: { qty: number; min: number }) {
  const max     = Math.max(qty, min * 3, 10)
  const pct     = Math.min((qty / max) * 100, 100)
  const isEmpty = qty === 0
  const isLow   = !isEmpty && qty <= min
  const color   = isEmpty ? "#EF4444" : isLow ? "#F59E0B" : "#10B981"

  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F3F4F6", flex: 1 }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function EstoqueClient({ products: initial }: Props) {
  const [products, setProducts]   = useState<ProductWithCat[]>(initial)
  const [search, setSearch]       = useState("")
  const [catFilter, setCatFilter] = useState<string>("all")
  const [saving, setSaving]       = useState<Record<string, boolean>>({})
  const [saved, setSaved]         = useState<Record<string, boolean>>({})
  const [, startTransition]       = useTransition()

  const combos = products.filter(p => p.stock_type === "combo")
  const filtered = combos.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = catFilter === "all" || (p.categories?.slug ?? "") === catFilter
    return matchSearch && matchCat
  })

  const categories = Array.from(
    new Map(
      combos.map(p => [p.categories?.slug ?? "outros", p.categories?.name ?? "Outros"])
    ).entries()
  )

  const total      = combos.length
  const okCount    = combos.filter(p => p.stock_quantity > p.min_stock_alert).length
  const lowCount   = combos.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length
  const emptyCount = combos.filter(p => p.stock_quantity === 0).length

  async function adjustQty(product: ProductWithCat, delta: number) {
    const newQty = Math.max(0, product.stock_quantity + delta)

    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, stock_quantity: newQty } : p)
    )
    setSaving(prev => ({ ...prev, [product.id]: true }))

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)("adjust_stock", {
      p_product_id: product.id,
      p_new_quantity: newQty,
      p_notes: "Ajuste manual — painel admin",
    })

    setSaving(prev => ({ ...prev, [product.id]: false }))
    setSaved(prev => ({ ...prev, [product.id]: true }))
    startTransition(() => {
      setTimeout(() => setSaved(prev => ({ ...prev, [product.id]: false })), 1500)
    })
  }

  const metrics = [
    { label: "Total",         value: total,      icon: Package,       iconBg: "#F3F4F6", iconColor: "#6B7280" },
    { label: "Em estoque",    value: okCount,    icon: CheckCircle2,  iconBg: "#D1FAE5", iconColor: "#059669" },
    { label: "Estoque baixo", value: lowCount,   icon: AlertTriangle, iconBg: "#FEF3C7", iconColor: "#D97706" },
    { label: "Esgotado",      value: emptyCount, icon: XCircle,       iconBg: "#FEE2E2", iconColor: "#DC2626" },
  ]

  return (
    <div className="min-h-full" style={{ background: "var(--surface-50)" }}>
      {/* Topbar */}
      <div
        className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--surface-100)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}
      >
        <div>
          <h1
            className="font-black"
            style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-950)" }}
          >
            Controle de Estoque
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-300)", marginTop: 2 }}>Combos disponíveis no freezer</p>
        </div>
      </div>

      <div className="p-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ background: iconBg }}
              >
                <Icon className="h-5 w-5" style={{ color: iconColor }} />
              </div>
              <p
                className="font-black text-gray-900"
                style={{ fontFamily: "var(--font-montserrat)", fontSize: 28, lineHeight: 1 }}
              >
                {value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Search + category filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-yellow-400 bg-white"
            />
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:border-yellow-400"
          >
            <option value="all">Todas</option>
            {categories.map(([slug, name]) => (
              <option key={slug} value={slug}>{name}</option>
            ))}
          </select>
        </div>

        {/* Product cards */}
        <div className="space-y-3">
          {filtered.map(product => {
            const qty         = product.stock_quantity
            const isEmpty     = qty === 0
            const isLow       = !isEmpty && qty <= product.min_stock_alert
            const statusColor = isEmpty ? "#EF4444" : isLow ? "#F59E0B" : "#10B981"
            const statusLabel = isEmpty ? "Esgotado" : isLow ? "Estoque baixo" : "OK"
            const isSaving    = saving[product.id]
            const isSaved     = saved[product.id]

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4 transition-all"
                style={{ borderColor: isEmpty ? "#FECACA" : isLow ? "#FDE68A" : "#F3F4F6" }}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                    {product.name}
                  </p>
                  {product.sku && (
                    <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <StockBar qty={qty} min={product.min_stock_alert} />
                    <span className="text-xs font-semibold shrink-0" style={{ color: statusColor }}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => adjustQty(product, -1)}
                    disabled={qty === 0 || isSaving}
                    className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{ background: "#F3F4F6", color: "#374151" }}
                    aria-label={`Diminuir estoque de ${product.name}`}
                  >
                    −
                  </button>
                  <span
                    className="w-10 text-center font-black text-gray-900"
                    style={{ fontFamily: "var(--font-montserrat)", fontSize: 18 }}
                  >
                    {isSaving ? "…" : isSaved ? "✓" : qty}
                  </span>
                  <button
                    onClick={() => adjustQty(product, 1)}
                    disabled={isSaving}
                    className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-colors"
                    style={{ background: "#C89B3C", color: "#fff" }}
                    aria-label={`Aumentar estoque de ${product.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 font-medium">Nenhum produto encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
