"use client"

import type { Category } from "@/types"

interface Props {
  categories: Category[]
  activeCategory: string | null
  onSelect: (id: string | null) => void
}

export function CategoryFilter({ categories, activeCategory, onSelect }: Props) {
  const isAll = activeCategory === null

  const pillStyle = (active: boolean): React.CSSProperties => ({
    whiteSpace: "nowrap",
    flexShrink: 0,
    padding: "9px 20px",
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: active ? 700 : 600,
    fontFamily: "'Montserrat', sans-serif",
    cursor: "pointer",
    transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
    minHeight: 40,
    border: active ? "1.5px solid #C89B3C" : "1.5px solid #E5E0D8",
    background: active ? "#C89B3C" : "white",
    color: active ? "white" : "#666",
    boxShadow: active ? "0 4px 12px rgba(200,155,60,0.35)" : "none",
  })

  return (
    <section
      style={{
        background: "rgba(255,253,248,0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 68,
        zIndex: 40,
        borderBottom: "1px solid rgba(229,224,216,0.6)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "14px 0",
        }}
      >
        {/* Scrollable row — no wrap on mobile */}
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            padding: "2px 20px 2px",
          }}
        >
          <button
            onClick={() => onSelect(null)}
            style={{ ...pillStyle(isAll), scrollSnapAlign: "start" }}
          >
            Todos
          </button>

          {categories.map((cat) => {
            const active = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                style={{ ...pillStyle(active), scrollSnapAlign: "start" }}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
