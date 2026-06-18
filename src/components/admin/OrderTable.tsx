"use client"
import { useState } from "react"
import { Search } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { OrderWithItems } from "@/types"

type Tab = "all" | "pending" | "production" | "ready"

const TABS: { key: Tab; label: string }[] = [
  { key: "all",        label: "Todos" },
  { key: "pending",    label: "Pendentes" },
  { key: "production", label: "Em Produção" },
  { key: "ready",      label: "Prontos" },
]

const STATUS_PILLS: Record<string, { bg: string; color: string; pip: string; label: string }> = {
  pending:    { bg: "#FEF3C7", color: "#92400E", pip: "#F59E0B", label: "Pendente" },
  production: { bg: "#DBEAFE", color: "#1E40AF", pip: "#3B82F6", label: "Em Produção" },
  ready:      { bg: "#D1FAE5", color: "#065F46", pip: "#10B981", label: "Pronto" },
  delivered:  { bg: "#F3F4F6", color: "#6B7280", pip: "#9CA3AF", label: "Entregue" },
}

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

  const filtered = orders.filter((o) => {
    const matchTab =
      activeTab === "all" ||
      (activeTab === "pending"    && o.status === "pending") ||
      (activeTab === "production" && o.status === "production") ||
      (activeTab === "ready"      && o.status === "ready")
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      o.customer_name.toLowerCase().includes(q) ||
      String(o.order_number).includes(q)
    return matchTab && matchSearch
  })

  function countFor(tab: Tab) {
    if (tab === "all") return orders.length
    return orders.filter((o) => o.status === tab).length
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Topbar */}
      <div
        style={{
          background: "var(--surface-100)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key
            const count = countFor(key)
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "14px 16px",
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
                  transition: "color var(--duration-micro)",
                }}
              >
                {label}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 9999,
                    background: isActive ? "var(--gold-dim)" : "#F3F4F6",
                    color: isActive ? "var(--gold-500)" : "var(--text-500)",
                    fontFamily: "var(--font-ui)",
                    transition: "all var(--duration-micro)",
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-50)",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 8,
            padding: "6px 12px",
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
              width: 140,
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--surface-50)" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-300)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              gap: 8,
            }}
          >
            <Search size={32} strokeWidth={1.5} style={{ opacity: 0.3 }} />
            Nenhum pedido encontrado
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Cliente / Prato", "Horário", "Itens", "Total", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      background: "var(--surface-100)",
                      padding: "10px 16px",
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      color: "var(--text-300)",
                      textAlign: "left",
                      borderBottom: "1px solid rgba(0,0,0,0.07)",
                      whiteSpace: "nowrap",
                      ...(h === "#"      ? { paddingLeft: 28 }  : {}),
                      ...(h === "Status" ? { paddingRight: 28 } : {}),
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const isSelected = order.id === selectedId
                const pill = STATUS_PILLS[order.status] ?? STATUS_PILLS.delivered
                const itemNames = order.order_items?.map((i) => i.product_name).join(", ") ?? ""

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelect(order)}
                    style={{
                      background: isSelected ? "#FDFAF3" : "var(--surface-100)",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                      cursor: "pointer",
                      borderLeft: isSelected ? "2px solid var(--gold-500)" : "2px solid transparent",
                      transition: "background var(--duration-micro)",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px 12px 28px",
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--text-300)",
                        verticalAlign: "middle",
                      }}
                    >
                      #{order.order_number}
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <p
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-950)",
                          marginBottom: 1,
                        }}
                      >
                        {order.customer_name}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          color: "var(--text-300)",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {itemNames}
                      </p>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--text-300)",
                        verticalAlign: "middle",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTime(order.created_at)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--text-500)",
                        verticalAlign: "middle",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.order_items?.length ?? 0}{" "}
                      {(order.order_items?.length ?? 0) === 1 ? "item" : "itens"}
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-950)",
                        }}
                      >
                        {formatCurrency(Number(order.total))}
                      </span>
                    </td>
                    <td style={{ padding: "12px 28px 12px 16px", verticalAlign: "middle" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: pill.bg,
                          color: pill.color,
                          padding: "4px 10px",
                          borderRadius: 9999,
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: pill.pip,
                            flexShrink: 0,
                          }}
                        />
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
