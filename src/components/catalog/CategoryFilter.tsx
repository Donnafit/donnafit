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
    <section
      style={{
        background: "#FFFFFF",
        position: "sticky",
        top: 64,
        zIndex: 40,
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        borderBottom: "1px solid #F0EDE8",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Botao Todos */}
          <button
            onClick={() => onSelect(null)}
            style={{
              whiteSpace: "nowrap",
              padding: "8px 20px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Montserrat', sans-serif",
              cursor: "pointer",
              transition: "all 0.2s",
              minHeight: 38,
              border: isAll
                ? "1.5px solid #C89B3C"
                : "1.5px solid #E5E0D8",
              background: isAll ? "#C89B3C" : "white",
              color: isAll ? "white" : "#666",
              boxShadow: isAll
                ? "0 4px 12px rgba(200,155,60,0.4)"
                : "none",
            }}
          >
            Todos
          </button>

          {/* Botoes de categoria */}
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "8px 20px",
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 600,
                  fontFamily: "'Montserrat', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  minHeight: 38,
                  border: isActive
                    ? "1.5px solid #C89B3C"
                    : "1.5px solid #E5E0D8",
                  background: isActive ? "#C89B3C" : "white",
                  color: isActive ? "white" : "#666",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(200,155,60,0.4)"
                    : "none",
                }}
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
