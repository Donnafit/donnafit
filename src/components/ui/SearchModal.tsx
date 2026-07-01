"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/hooks/useCart"
import { formatCurrency, resolveImageSrc } from "@/lib/utils"

interface SearchResult {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  stock_quantity: number
  is_active: boolean
  categories?: { name: string } | null
}

const SUGGESTIONS = ["Frango", "Vegano", "Low carb", "Combo", "Sopa", "Integral"]

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [addedId, setAddedId] = useState<string | null>(null)
  const { addItem } = useCart()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setSelectedIndex(-1)
      document.body.style.overflow = "hidden"
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, stock_quantity, is_active, categories(name)")
      .eq("is_active", true)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order("sort_order")
      .limit(8)
    setResults((data as SearchResult[]) ?? [])
    setLoading(false)
    setSelectedIndex(-1)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), 280)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, -1))
    }
    if (e.key === "Enter" && selectedIndex >= 0) {
      scrollToProduct(results[selectedIndex].id)
    }
  }

  function handleAdd(e: React.MouseEvent, product: SearchResult) {
    e.stopPropagation()
    if (product.stock_quantity <= 0) return
    addItem(product as any)
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 1200)
  }

  function scrollToProduct(id: string) {
    onClose()
    setTimeout(() => {
      const el = document.querySelector(`[data-product-id="${id}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 220)
  }

  if (!open) return null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(5px)",
          animation: "fadeIn 0.18s ease",
        }}
        onClick={onClose}
      />

      {/* Search box */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(640px, calc(100vw - 32px))",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
          overflow: "hidden",
          animation: "slideDownIn 0.24s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "16px 20px", gap: 12,
          borderBottom: (results.length > 0 || query) ? "1px solid #F0EDE8" : "none",
        }}>
          {loading ? (
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2.5px solid #E5E0D8",
              borderTopColor: "#5A6B2A",
              animation: "spin 0.6s linear infinite",
              flexShrink: 0,
            }} />
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#AAA" strokeWidth={2.5} style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar marmitas, sopas, combos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 16, fontFamily: "var(--font-switzer), sans-serif",
              color: "#1A1A1A", background: "transparent",
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              style={{ background: "#F5F0E8", border: "none", cursor: "pointer", color: "#999", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              aria-label="Limpar busca"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{ background: "#F5F0E8", border: "none", cursor: "pointer", color: "#999", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              aria-label="Fechar busca"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {results.map((p, i) => {
              const soldOut = p.stock_quantity <= 0
              const isSelected = selectedIndex === i
              const isAdded = addedId === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => scrollToProduct(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "11px 20px",
                    background: isSelected ? "#F5F8F0" : "transparent",
                    cursor: "pointer",
                    transition: "background 0.12s",
                    borderBottom: i < results.length - 1 ? "1px solid #FAF8F5" : "none",
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    overflow: "hidden", flexShrink: 0, background: "#F5F0E8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveImageSrc(p.image_url)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>🥗</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 600, fontSize: 14, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      {(p as any).categories?.name && (
                        <span style={{ fontSize: 10, color: "#5A6B2A", fontWeight: 600, fontFamily: "var(--font-switzer), sans-serif" }}>
                          {(p as any).categories.name}
                        </span>
                      )}
                      {soldOut && (
                        <span style={{ fontSize: 10, color: "#E05252", fontWeight: 600, fontFamily: "var(--font-switzer), sans-serif" }}>
                          Esgotado
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 13, color: "#C89B3C", marginTop: 2 }}>
                      {formatCurrency(p.price)}
                    </div>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={(e) => handleAdd(e, p)}
                    disabled={soldOut}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: soldOut ? "#EEE" : isAdded ? "#5A6B2A" : "#5A6B2A",
                      border: "none", cursor: soldOut ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.2s ease", opacity: soldOut ? 0.4 : 1,
                    }}
                  >
                    {isAdded ? (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div style={{ padding: "36px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 14, color: "#999", margin: 0 }}>
              Nenhum resultado para <strong style={{ color: "#1A1A1A" }}>"{query}"</strong>
            </p>
            <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12, color: "#BBB", margin: "6px 0 0" }}>
              Tente outra palavra-chave
            </p>
          </div>
        )}

        {/* Empty state — suggestions */}
        {!query && (
          <div style={{ padding: "20px 20px 24px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#C0B8B0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontFamily: "var(--font-switzer), sans-serif" }}>
              Sugestões de busca
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  style={{
                    background: "#F5F8F0", border: "1.5px solid #E4ECCC",
                    borderRadius: 20, padding: "7px 16px",
                    fontSize: 13, color: "#5A6B2A", fontWeight: 500,
                    cursor: "pointer", fontFamily: "var(--font-switzer), sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
