"use client"
import { useState } from "react"
import { BookOpen, Search, ChefHat, Tag, ChevronDown } from "lucide-react"
import { resolveImageSrc } from "@/lib/utils"

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

function ProductThumb({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return <ChefHat size={13} strokeWidth={1.5} style={{ color: "var(--text-300)" }} />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveImageSrc(src, 120)}
      alt={alt}
      onError={() => setBroken(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  )
}

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveImageSrc(src, 640)}
      alt={alt}
      onError={() => setBroken(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  )
}

export function ManualClient({ products }: Props) {
  const [selected, setSelected] = useState<ProductWithCategory | null>(products[0] ?? null)
  const [search,   setSearch]   = useState("")

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.categories?.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filtered.reduce<Record<string, ProductWithCategory[]>>((acc, p) => {
    const cat = p.categories?.name ?? "Sem categoria"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const categoryNames = Object.keys(grouped)

  // Accordion — todas abertas por padrão
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set(categoryNames))

  function toggleCat(cat: string) {
    setOpenCats((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <>
      <style>{`
        .manual-sidebar::-webkit-scrollbar { width: 4px; }
        .manual-sidebar::-webkit-scrollbar-track { background: transparent; }
        .manual-sidebar::-webkit-scrollbar-thumb {
          background: rgba(200,155,60,0.25);
          border-radius: 99px;
        }
        .manual-sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(200,155,60,0.5);
        }
        .manual-detail::-webkit-scrollbar { width: 4px; }
        .manual-detail::-webkit-scrollbar-track { background: transparent; }
        .manual-detail::-webkit-scrollbar-thumb {
          background: rgba(200,155,60,0.20);
          border-radius: 99px;
        }
        .manual-detail::-webkit-scrollbar-thumb:hover {
          background: rgba(200,155,60,0.4);
        }
        .cat-chevron { transition: transform 200ms; }
        .cat-chevron.open { transform: rotate(180deg); }
        .sidebar-item:hover { background: rgba(200,155,60,0.04) !important; }
      `}</style>

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{
          background: "var(--surface-100)",
          borderBottom: "1px solid var(--surface-200)",
          padding: "18px 24px",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "rgba(200,155,60,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <BookOpen size={16} strokeWidth={1.8} style={{ color: "var(--gold-500)" }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 800, color: "var(--text-950)" }}>
              Manual de Preparo
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 1 }}>
              {products.length} produtos cadastrados
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar */}
          <div style={{
            width: 280, flexShrink: 0,
            display: "flex", flexDirection: "column",
            background: "var(--surface-100)",
            borderRight: "1px solid var(--surface-200)",
            overflow: "hidden",
          }}>
            {/* Search */}
            <div style={{ padding: "12px", borderBottom: "1px solid var(--surface-200)", flexShrink: 0 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--surface-50)",
                border: "1px solid var(--surface-200)",
                borderRadius: 9, padding: "0 12px",
              }}>
                <Search size={12} strokeWidth={1.8} style={{ color: "var(--text-300)", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    flex: 1, fontFamily: "var(--font-ui)", fontSize: 12,
                    color: "var(--text-950)", background: "transparent",
                    border: "none", outline: "none", padding: "9px 0",
                  }}
                />
              </div>
            </div>

            {/* Accordion list */}
            <div className="manual-sidebar" style={{ flex: 1, overflowY: "auto" }}>
              {Object.entries(grouped).map(([cat, items]) => {
                const isOpen = openCats.has(cat)
                return (
                  <div key={cat}>
                    {/* Category header (accordion toggle) */}
                    <button
                      onClick={() => toggleCat(cat)}
                      style={{
                        width: "100%", textAlign: "left",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 16px",
                        background: "var(--surface-50)",
                        border: "none",
                        borderBottom: "1px solid var(--surface-200)",
                        position: "sticky", top: 0, zIndex: 2,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{
                        fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "1px",
                        color: "var(--text-300)",
                      }}>
                        {cat}
                        <span style={{
                          marginLeft: 6,
                          background: "rgba(200,155,60,0.12)",
                          color: "var(--gold-500)",
                          borderRadius: 99, padding: "1px 6px",
                          fontSize: 9, fontWeight: 700,
                        }}>
                          {items.length}
                        </span>
                      </span>
                      <ChevronDown
                        size={12}
                        strokeWidth={2.5}
                        className={`cat-chevron${isOpen ? " open" : ""}`}
                        style={{ color: "var(--text-300)", flexShrink: 0 }}
                      />
                    </button>

                    {/* Accordion body */}
                    {isOpen && items.map((p) => {
                      const isActive = selected?.id === p.id
                      return (
                        <button
                          key={p.id}
                          className="sidebar-item"
                          onClick={() => setSelected(p)}
                          style={{
                            width: "100%", textAlign: "left",
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 16px",
                            background: isActive ? "rgba(200,155,60,0.08)" : "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--surface-200)",
                            cursor: "pointer",
                            transition: "background 120ms",
                          }}
                        >
                          {/* Thumbnail */}
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            overflow: "hidden",
                            background: isActive ? "rgba(200,155,60,0.12)" : "var(--surface-200)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <ProductThumb src={p.image_url} alt={p.name} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontFamily: "var(--font-ui)", fontSize: 12,
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? "var(--gold-500)" : "var(--text-700)",
                              lineHeight: 1.3,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {p.name}
                            </p>
                            {p.sku && (
                              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-300)", marginTop: 1 }}>
                                {p.sku}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <BookOpen size={24} strokeWidth={1.5} style={{ color: "var(--text-300)", margin: "0 auto 8px" }} />
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>
                    Nenhum produto encontrado
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div
            className="manual-detail"
            style={{ flex: 1, overflowY: "auto", background: "var(--surface-50)" }}
          >
            {selected ? (
              <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 32px" }}>

                {/* Image */}
                {selected.image_url && (
                  <div style={{
                    width: "100%", borderRadius: 16, overflow: "hidden",
                    aspectRatio: "16/7", marginBottom: 20,
                    background: "var(--surface-200)",
                  }}>
                    <ProductImage src={selected.image_url} alt={selected.name} />
                  </div>
                )}

                {/* Title card */}
                <div style={{
                  background: "var(--surface-100)",
                  border: "1px solid var(--surface-200)",
                  borderRadius: 14, padding: "20px 24px", marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <h2 style={{
                      fontFamily: "var(--font-ui)", fontSize: 20, fontWeight: 800,
                      color: "var(--text-950)", lineHeight: 1.2,
                    }}>
                      {selected.name}
                    </h2>
                    {selected.categories?.name && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
                        padding: "4px 11px", borderRadius: 99, flexShrink: 0,
                        background: "rgba(200,155,60,0.10)", color: "var(--gold-500)",
                      }}>
                        <Tag size={10} strokeWidth={2} />
                        {selected.categories.name}
                      </span>
                    )}
                  </div>
                  {selected.sku && (
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)" }}>
                      Código: {selected.sku}
                    </p>
                  )}
                </div>

                {/* Modo de preparo */}
                {selected.prep_instructions ? (
                  <div style={{
                    background: "var(--surface-100)",
                    border: "1px solid var(--surface-200)",
                    borderRadius: 14, padding: "20px 24px", marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: "rgba(200,155,60,0.10)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <ChefHat size={14} strokeWidth={1.8} style={{ color: "var(--gold-500)" }} />
                      </div>
                      <p style={{
                        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--text-300)",
                      }}>
                        Modo de Preparo
                      </p>
                    </div>
                    <p style={{
                      fontFamily: "var(--font-ui)", fontSize: 14,
                      color: "var(--text-700)", lineHeight: 1.7, whiteSpace: "pre-line",
                    }}>
                      {selected.prep_instructions}
                    </p>
                  </div>
                ) : (
                  <div style={{
                    background: "var(--surface-100)",
                    border: "1px solid var(--surface-200)",
                    borderRadius: 14, padding: "32px 24px", textAlign: "center", marginBottom: 12,
                  }}>
                    <ChefHat size={28} strokeWidth={1.5} style={{ color: "var(--text-300)", margin: "0 auto 8px" }} />
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>
                      Nenhuma instrução de preparo cadastrada.
                    </p>
                  </div>
                )}

                {/* Descrição */}
                {selected.description && (
                  <div style={{
                    background: "var(--surface-100)",
                    border: "1px solid var(--surface-200)",
                    borderRadius: 14, padding: "20px 24px",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.8px",
                      color: "var(--text-300)", marginBottom: 12,
                    }}>
                      Descrição / Ingredientes
                    </p>
                    <p style={{
                      fontFamily: "var(--font-ui)", fontSize: 13,
                      color: "var(--text-700)", lineHeight: 1.7, whiteSpace: "pre-line",
                    }}>
                      {selected.description}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                height: "100%", display: "flex",
                flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <BookOpen size={36} strokeWidth={1.2} style={{ color: "var(--text-300)", opacity: 0.5 }} />
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--text-300)" }}>
                  Selecione um produto
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>
                  Clique em um item na lista ao lado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
