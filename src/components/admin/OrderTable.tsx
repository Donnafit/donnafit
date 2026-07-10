"use client"
import { useState } from "react"
import type { CSSProperties } from "react"
import { Search, Package, LayoutGrid, List } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { getStatusPill, KANBAN_COLUMNS } from "@/lib/orderStatus"
import { useIsMobile } from "@/hooks/useIsMobile"
import type { OrderWithItems } from "@/types"

type Tab = "all" | (typeof KANBAN_COLUMNS)[number]["key"]

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Todos" },
  ...KANBAN_COLUMNS.map((c) => ({ key: c.key as Tab, label: c.label })),
]

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Props {
  orders: OrderWithItems[]
  selectedId: string | null
  onSelect: (order: OrderWithItems) => void
}

export function OrderTable({ orders, selectedId, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const isMobile = useIsMobile()

  const filtered = orders.filter((o) => {
    const column = KANBAN_COLUMNS.find((c) => c.key === activeTab)
    const matchTab = activeTab === "all" || (column?.match(o) ?? false)
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      o.customer_name.toLowerCase().includes(q) ||
      String(o.order_number).includes(q)
    return matchTab && matchSearch
  })

  function countFor(tab: Tab) {
    if (tab === "all") return orders.length
    const column = KANBAN_COLUMNS.find((c) => c.key === tab)
    return column ? orders.filter(column.match).length : 0
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

      {/* Topbar: tabs + search */}
      <div
        style={{
          background: "var(--surface-100)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          flexWrap: "wrap",
          rowGap: 8,
        }}
      >
        <div className="tabs-scroll-wrap" style={{ position: "relative", minWidth: 0 }}>
          <div className="scrollbar-hidden" style={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {TABS.map(({ key, label }) => {
            const isActive = activeTab === key
            const count    = countFor(key)
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "0 10px",
                  height: 52,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? "var(--text-950)" : "var(--text-300)",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? "var(--gold-500)" : "transparent"}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  transition: "color 120ms, border-color 120ms",
                }}
              >
                {label}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 9999,
                    background: isActive ? "rgba(200,155,60,0.12)" : "#F3F4F6",
                    color: isActive ? "var(--gold-500)" : "var(--text-300)",
                  }}
                >
                  {count}
                </span>
              </button>
            )
            })}
          </div>
          <div
            aria-hidden
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: 16,
              background: "linear-gradient(to right, transparent, var(--surface-100))",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Busca + toggle Lista/Kanban — linha própria e cheia no mobile, busca à esquerda / toggle à direita */}
        <div className="w-full md:w-auto md:ml-4" style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "var(--surface-50)",
              border: "1px solid var(--surface-200)",
              borderRadius: 9,
              padding: "0 14px",
              height: 40,
              boxSizing: "border-box",
              flex: 1,
              minWidth: 0,
            }}
          >
            <Search size={13} strokeWidth={1.8} style={{ color: "var(--text-300)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pedido..."
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--text-700)",
                background: "transparent",
                border: "none",
                outline: "none",
                width: "100%",
                minWidth: 0,
                maxWidth: 280,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", background: "var(--surface-50)", border: "1px solid var(--surface-200)", borderRadius: 9, padding: 3, height: 40, boxSizing: "border-box", marginLeft: "auto", flexShrink: 0 }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "0 14px", height: "100%", borderRadius: 6, border: "none", cursor: "pointer",
                background: viewMode === "list" ? "#fff" : "transparent",
                color: viewMode === "list" ? "var(--text-950)" : "var(--text-300)",
                boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
              }}
            >
              <List size={14} /> Lista
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                padding: "0 14px", height: "100%", borderRadius: 6, border: "none", cursor: "pointer",
                background: viewMode === "kanban" ? "#fff" : "transparent",
                color: viewMode === "kanban" ? "var(--text-950)" : "var(--text-300)",
                boxShadow: viewMode === "kanban" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
              }}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--surface-100)" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 12,
            }}
          >
            <div
              style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(0,0,0,0.04)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Package size={20} strokeWidth={1.5} style={{ color: "var(--text-300)" }} />
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-300)", fontWeight: 500 }}>
              Nenhum pedido encontrado
            </p>
          </div>
        ) : viewMode === "kanban" ? (
          <div
            className="scrollbar-hidden"
            style={{
              display: "flex", gap: 16, padding: 24, minHeight: "100%",
              overflowX: "auto", scrollSnapType: "x proximity",
              WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain", touchAction: "pan-x",
            }}
          >
            {KANBAN_COLUMNS.map((column) => {
              const colOrders = filtered.filter(column.match)
              return (
                <div key={column.key} style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", gap: 12, scrollSnapAlign: "start" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--text-950)", margin: 0 }}>
                        {column.label}
                      </h3>
                    </div>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--text-400)", background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: 12 }}>
                      {colOrders.length}
                    </span>
                  </div>
                  {colOrders.map(order => {
                    const isSelected = order.id === selectedId
                    const itemNames = order.order_items?.map((i) => i.product_name).join(", ") ?? ""
                    const cardPill = getStatusPill(order)
                    return (
                      <div
                        key={order.id}
                        onClick={() => onSelect(order)}
                        style={{
                          background: isSelected ? "#FFFDF5" : "#fff",
                          border: `1px solid ${isSelected ? "var(--gold-500)" : "var(--surface-200)"}`,
                          borderRadius: 12, padding: 16, cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          transition: "all 0.15s ease",
                          display: "flex", flexDirection: "column", gap: 10,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.transform = "translateY(-2px)"
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.transform = "none"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--gold-500)" }}>
                            #{order.order_number}
                          </span>
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-400)" }}>
                            {formatTime(order.created_at)}
                          </span>
                        </div>
                        {column.key === "rota" && (
                          <span
                            style={{
                              alignSelf: "flex-start",
                              display: "inline-flex", alignItems: "center", gap: 5,
                              background: cardPill.bg, color: cardPill.color, padding: "3px 9px",
                              borderRadius: 9999, fontFamily: "var(--font-ui)",
                              fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cardPill.pip, flexShrink: 0 }} />
                            {cardPill.label}
                          </span>
                        )}
                        <div>
                          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)", margin: "0 0 2px", lineHeight: 1.3 }}>
                            {order.customer_name}
                          </p>
                          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-400)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                            {itemNames}
                          </p>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--surface-200)", paddingTop: 10, marginTop: 2 }}>
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-400)" }}>
                            {order.order_items?.length ?? 0} {(order.order_items?.length ?? 0) === 1 ? "item" : "itens"}
                          </span>
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, color: "var(--text-950)" }}>
                            {formatCurrency(Number(order.total))}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
            {filtered.map((order) => {
              const isSelected = order.id === selectedId
              const pill = getStatusPill(order)
              const itemNames = order.order_items?.map((i) => i.product_name).join(", ") ?? ""
              return (
                <div
                  key={order.id}
                  onClick={() => onSelect(order)}
                  style={{
                    background: isSelected ? "rgba(200,155,60,0.07)" : "#fff",
                    border: `1px solid ${isSelected ? "var(--gold-500)" : "var(--surface-200)"}`,
                    borderRadius: 12, padding: 14, cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--gold-500)" }}>
                      #{order.order_number}
                    </span>
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: pill.bg, color: pill.color, padding: "4px 10px",
                        borderRadius: 9999, fontFamily: "var(--font-ui)",
                        fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: pill.pip, flexShrink: 0 }} />
                      {pill.label}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)", margin: 0 }}>
                    {order.customer_name}
                  </p>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-400)", margin: 0, lineHeight: 1.4 }}>
                    {itemNames}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--surface-200)", paddingTop: 8 }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-400)" }}>
                      {formatTime(order.created_at)} · {order.order_items?.length ?? 0} {(order.order_items?.length ?? 0) === 1 ? "item" : "itens"}
                    </span>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, color: "var(--text-950)" }}>
                      {formatCurrency(Number(order.total))}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-50)", borderBottom: "1px solid var(--surface-200)" }}>
                <th style={thStyle({ w: 120 })}>Pedido</th>
                <th style={thStyle({ flex: true })}>Cliente / Prato</th>
                <th style={thStyle({ w: 90 })}>Horário</th>
                <th style={thStyle({ w: 80 })}>Itens</th>
                <th style={thStyle({ w: 120 })}>Total</th>
                <th style={thStyle({ w: 140, right: true })}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const isSelected = order.id === selectedId
                const pill = getStatusPill(order)
                const itemNames = order.order_items?.map((i) => i.product_name).join(", ") ?? ""

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelect(order)}
                    style={{
                      background: isSelected ? "rgba(200,155,60,0.07)" : "var(--surface-100)",
                      borderBottom: "1px solid var(--surface-200)",
                      cursor: "pointer",
                      borderLeft: `3px solid ${isSelected ? "var(--gold-500)" : "transparent"}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-50)"
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-100)"
                    }}
                  >
                    {/* # */}
                    <td style={{ padding: "14px 16px 14px 28px", verticalAlign: "middle" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--gold-500)" }}>
                        #{order.order_number}
                      </span>
                    </td>

                    {/* Cliente / Prato */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)", marginBottom: 2, lineHeight: 1.3 }}>
                        {order.customer_name}
                      </p>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {itemNames}
                      </p>
                    </td>

                    {/* Horário */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-500)" }}>
                        {formatTime(order.created_at)}
                      </span>
                    </td>

                    {/* Itens */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-500)" }}>
                        {order.order_items?.length ?? 0}{" "}
                        {(order.order_items?.length ?? 0) === 1 ? "item" : "itens"}
                      </span>
                    </td>

                    {/* Total */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--text-950)" }}>
                        {formatCurrency(Number(order.total))}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 28px 14px 16px", verticalAlign: "middle" }}>
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: pill.bg, color: pill.color, padding: "5px 11px",
                          borderRadius: 9999, fontFamily: "var(--font-ui)",
                          fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: pill.pip, flexShrink: 0 }} />
                        {pill.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function thStyle({ w, flex, right }: { w?: number; flex?: boolean; right?: boolean }): CSSProperties {
  return {
    padding: "10px 16px",
    ...(right ? { paddingRight: 28 } : {}),
    fontFamily: "var(--font-ui)",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: "var(--text-300)",
    textAlign: "left",
    whiteSpace: "nowrap",
    ...(flex ? {} : { width: w }),
  }
}
