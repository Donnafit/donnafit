"use client"

import type { Category } from "@/types"

interface Props {
  categories: Category[]
  activeCategory: string | null
  onSelect: (id: string | null) => void
}

export function CategoryFilter({ categories, activeCategory, onSelect }: Props) {
  const isAll = activeCategory === null

  return (
    <div
      style={{
        position: "sticky",
        top: 64,
        zIndex: 40,
        background: "#FAF8F5",
        borderBottom: "1px solid #EDE8E0",
      }}
    >
      {/* scrollável no mobile, centralizado no desktop */}
      <div
        className="cat-filter-scroll"
        style={{ overflowX: "auto", scrollbarWidth: "none" }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "22px 24px",
            justifyContent: "center",
            minWidth: "100%",
            width: "max-content",
            maxWidth: 1200,
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          <Chip active={isAll} onClick={() => onSelect(null)}>Todos</Chip>
          {categories.map((cat) => (
            <Chip key={cat.id} active={activeCategory === cat.id} onClick={() => onSelect(cat.id)}>
              {cat.name}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        whiteSpace: "nowrap",
        padding: "8px 20px",
        borderRadius: 100,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        fontFamily: "'Montserrat', sans-serif",
        cursor: "pointer",
        transition: "all 0.18s ease",
        border: active ? "1.5px solid #C89B3C" : "1.5px solid transparent",
        background: active ? "#C89B3C" : "rgba(0,0,0,0.04)",
        color: active ? "#fff" : "#666",
        boxShadow: active ? "0 3px 10px rgba(200,155,60,0.35)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#EFF4E6"
          e.currentTarget.style.color = "#5A6B2A"
          e.currentTarget.style.border = "1.5px solid #C8DCA0"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(0,0,0,0.04)"
          e.currentTarget.style.color = "#666"
          e.currentTarget.style.border = "1.5px solid transparent"
        }
      }}
    >
      {children}
    </button>
  )
}
