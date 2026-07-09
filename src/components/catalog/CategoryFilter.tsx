"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Check, SlidersHorizontal, Search } from "lucide-react"
import type { Category } from "@/types"

const DESKTOP_VISIBLE = 5
const MOBILE_VISIBLE_LAST = true // mostra primeira e última no mobile

// ─── Subcomponentes fora do render para evitar remount ───────────────────────

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
        fontFamily: "var(--font-switzer), sans-serif",
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

function DropdownMenu({
  items,
  isAll,
  activeCategory,
  onSelect,
}: {
  items: { id: string | null; name: string }[]
  isAll: boolean
  activeCategory: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        border: "1px solid #EDE8E0",
        minWidth: 210,
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      <div style={{
        padding: "10px 14px 9px",
        display: "flex", alignItems: "center", gap: 6,
        borderBottom: "1px solid #F0EDE8",
      }}>
        <SlidersHorizontal size={12} color="#C89B3C" />
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#C0B8B0",
          letterSpacing: "0.12em", textTransform: "uppercase",
          fontFamily: "var(--font-switzer), sans-serif",
        }}>
          Filtrar por categoria
        </span>
      </div>
      {items.map((item, i) => {
        const active = item.id === null ? isAll : activeCategory === item.id
        return (
          <button
            key={item.id ?? "all"}
            onClick={() => onSelect(item.id)}
            style={{
              width: "100%", textAlign: "left",
              padding: "11px 14px",
              background: active ? "rgba(200,155,60,0.08)" : "transparent",
              border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: active ? 600 : 400,
              fontFamily: "var(--font-switzer), sans-serif",
              color: active ? "#C89B3C" : "#333",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "background 0.12s",
              borderBottom: i < items.length - 1 ? "1px solid #FAF8F5" : "none",
            }}
          >
            {item.name}
            {active && <Check size={14} color="#C89B3C" />}
          </button>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  categories: Category[]
  activeCategory: string | null
  onSelect: (id: string | null) => void
  onSearch?: (q: string) => void
}

export function CategoryFilter({ categories, activeCategory, onSelect, onSearch }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isAll = activeCategory === null

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [dropdownOpen])

  function handleSelect(id: string | null) {
    onSelect(id)
    setDropdownOpen(false)
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q)
    onSearch?.(q)
  }

  const visibleDesktop = categories.slice(0, DESKTOP_VISIBLE)
  const hiddenDesktop  = categories.slice(DESKTOP_VISIBLE)

  // Mobile: primeira + última; meio vai pro dropdown
  const visibleMobile = categories.length > 1
    ? [categories[0], categories[categories.length - 1]]
    : categories.slice(0, 1)
  const hiddenMobile = categories.length > 1
    ? categories.slice(1, categories.length - 1)
    : []

  const hiddenDesktopItems = [
    { id: null as string | null, name: "Todos" },
    ...hiddenDesktop.map((c) => ({ id: c.id, name: c.name })),
  ]
  const hiddenMobileItems = [
    { id: null as string | null, name: "Todos" },
    ...hiddenMobile.map((c) => ({ id: c.id, name: c.name })),
  ]

  const hasHiddenActiveDesktop = hiddenDesktop.some((c) => c.id === activeCategory)
  const hasHiddenActiveMobile  = hiddenMobile.some((c) => c.id === activeCategory)

  return (
    <div
      style={{
        background: "#FAF8F5",
        borderBottom: "1px solid #EDE8E0",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px 32px" }}>

        {/* Título */}
        <p style={{
          textAlign: "center",
          fontFamily: "var(--font-switzer), sans-serif",
          fontWeight: 400,
          fontSize: "clamp(18px, 2.5vw, 24px)",
          color: "#1A1A1A",
          marginBottom: 12,
        }}>
          Encontre sua marmita predileta
        </p>

        {/* Barra de pesquisa */}
        <div style={{ position: "relative", marginBottom: 12, maxWidth: 520, margin: "0 auto 12px" }}>
          <Search
            size={16}
            style={{
              position: "absolute", left: 14, top: "50%",
              transform: "translateY(-50%)", color: "#AAA", pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: "100%", padding: "11px 40px 11px 40px",
              borderRadius: 50,
              border: "1.5px solid #EDE8E0",
              background: "#fff", fontSize: 14,
              fontFamily: "var(--font-switzer), sans-serif",
              color: "#1A1A1A", outline: "none",
              transition: "border-color 0.18s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#C89B3C" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#EDE8E0" }}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#AAA", display: "flex", padding: 2,
              }}
            >
              <Plus size={14} style={{ transform: "rotate(45deg)" }} />
            </button>
          )}
        </div>

        {/* ── Desktop chips ──────────────────────── */}
        <div className="hidden md:flex" style={{ gap: 8, alignItems: "center", justifyContent: "center" }}>
          <Chip active={isAll} onClick={() => handleSelect(null)}>Todos</Chip>
          {visibleDesktop.map((cat) => (
            <Chip key={cat.id} active={activeCategory === cat.id} onClick={() => handleSelect(cat.id)}>
              {cat.name}
            </Chip>
          ))}
          {hiddenDesktop.length > 0 && (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                aria-label="Ver todas as categorias"
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: hasHiddenActiveDesktop ? "#C89B3C" : dropdownOpen ? "#5A6B2A" : "rgba(0,0,0,0.06)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s ease", flexShrink: 0,
                }}
              >
                <Plus
                  size={16}
                  color={hasHiddenActiveDesktop || dropdownOpen ? "#fff" : "#555"}
                  style={{ transform: dropdownOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}
                />
              </button>
              {dropdownOpen && (
                <DropdownMenu
                  items={hiddenDesktopItems}
                  isAll={isAll}
                  activeCategory={activeCategory}
                  onSelect={handleSelect}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Mobile chips ───────────────────────── */}
        <div className="flex md:hidden" style={{ gap: 8, alignItems: "center" }}>
          <Chip active={isAll} onClick={() => handleSelect(null)}>Todos</Chip>
          {visibleMobile.map((cat) => (
            <Chip key={cat.id} active={activeCategory === cat.id} onClick={() => handleSelect(cat.id)}>
              {cat.name}
            </Chip>
          ))}
          <div style={{ marginLeft: "auto", position: "relative" }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              aria-label="Ver todas as categorias"
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: hasHiddenActiveMobile ? "#C89B3C" : dropdownOpen ? "#5A6B2A" : "rgba(0,0,0,0.06)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s ease", flexShrink: 0,
              }}
            >
              <Plus
                size={16}
                color={hasHiddenActiveMobile || dropdownOpen ? "#fff" : "#555"}
                style={{ transform: dropdownOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}
              />
            </button>
            {dropdownOpen && (
              <DropdownMenu
                items={hiddenMobileItems}
                isAll={isAll}
                activeCategory={activeCategory}
                onSelect={handleSelect}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
