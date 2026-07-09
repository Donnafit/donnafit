"use client"
import { useState, useRef } from "react"
import { ChefHat, Search, Plus, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string | null
  stock_quantity: number
  min_stock_alert: number
  categories: { name: string } | null
}

interface RestockLog {
  id: string
  product_id: string
  quantity: number
  notes: string | null
  created_at: string
  product: { name: string; sku: string | null } | null
}

interface Props {
  products: Product[]
  todayRestocks: RestockLog[]
}

function StockBar({ qty, min }: { qty: number; min: number }) {
  const max   = Math.max(qty, min * 3, 10)
  const pct   = Math.min((qty / max) * 100, 100)
  const color = qty === 0 ? "#EF4444" : qty <= min ? "#F59E0B" : "#10B981"
  return (
    <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--surface-200)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 400ms" }} />
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function KitchenClient({ products: initial, todayRestocks: initialLog }: Props) {
  const [products, setProducts]   = useState<Product[]>(initial)
  const [restockLog, setLog]      = useState<RestockLog[]>(initialLog)
  const [search, setSearch]       = useState("")
  const [selectedId, setSelectedId] = useState<string>("")
  const [qty, setQty]             = useState<string>("")
  const [saving, setSaving]       = useState(false)
  const [flash, setFlash]         = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  const empty = products.filter((p) => p.stock_quantity === 0)
  const low   = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert)

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const selectedProduct = products.find((p) => p.id === selectedId) ?? null

  async function handleRegister() {
    const amount = parseInt(qty, 10)
    if (!selectedId || !amount || amount <= 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/kitchen/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedId, quantity: amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Atualiza estado local
      setProducts((prev) =>
        prev.map((p) => p.id === selectedId ? { ...p, stock_quantity: data.newQuantity } : p)
      )
      setLog((prev) => [{
        id: `local-${Date.now()}`,
        product_id: selectedId,
        quantity: amount,
        notes: null,
        created_at: new Date().toISOString(),
        product: { name: data.productName, sku: selectedProduct?.sku ?? null },
      }, ...prev])

      setFlash(`+${amount} ${data.productName}`)
      setTimeout(() => setFlash(null), 2500)
      setQty("")
      setSelectedId("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar produção.")
    } finally {
      setSaving(false)
    }
  }

  function quickFill(productId: string) {
    setSelectedId(productId)
    setSearch("")
    qtyRef.current?.focus()
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--surface-50)" }}>

      {/* Toast de sucesso */}
      {flash && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#10B981", color: "#fff",
          fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
          padding: "10px 20px", borderRadius: 99,
          boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
          zIndex: 999, animation: "fadeUp 200ms ease",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <CheckCircle2 size={15} strokeWidth={2} />
          Registrado: {flash}
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(8px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
      `}</style>

      {/* Header */}
      <div style={{
        background: "var(--surface-100)",
        borderBottom: "1px solid var(--surface-200)",
        padding: "20px 28px",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(200,155,60,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ChefHat size={17} strokeWidth={1.8} style={{ color: "var(--gold-500)" }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 800, color: "var(--text-950)" }}>
              Painel da Cozinha
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 1 }}>
              Repor estoque após cada produção
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-7" style={{ paddingTop: 24, paddingBottom: 24, maxWidth: 900, margin: "0 auto" }}>

        {/* Métricas de alerta — mesmo padrão visual dos cards do Estoque (ícone em cima) */}
        <div className="grid grid-cols-3" style={{ gap: 10, marginBottom: 24 }}>
          {[
            { label: "Esgotados",    value: empty.length, Icon: XCircle,      accent: "#EF4444", dim: "rgba(239,68,68,0.1)" },
            { label: "Estoque baixo",value: low.length,   Icon: AlertTriangle, accent: "#F59E0B", dim: "rgba(245,158,11,0.1)" },
            { label: "Produzidos hoje", value: restockLog.reduce((s, r) => s + r.quantity, 0), Icon: CheckCircle2, accent: "#10B981", dim: "rgba(16,185,129,0.1)" },
          ].map(({ label, value, Icon, accent, dim }) => (
            <div key={label} style={{
              background: "var(--surface-100)",
              border: "1px solid var(--surface-200)",
              borderRadius: 14, padding: "14px 12px",
              minWidth: 0,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: dim,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 10,
              }}>
                <Icon size={15} strokeWidth={1.8} style={{ color: accent }} />
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 20, fontWeight: 900, color: "var(--text-950)", lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-300)", marginTop: 4, lineHeight: 1.25 }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Seção: Precisam de reposição */}
        {(empty.length > 0 || low.length > 0) && (
          <div style={{ marginBottom: 24 }}>
            <p style={{
              fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.9px",
              color: "var(--text-300)", marginBottom: 10,
            }}>
              Precisam de reposição
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...empty, ...low].map((p) => {
                const isEmpty = p.stock_quantity === 0
                return (
                  <div
                    key={p.id}
                    style={{
                      background: "var(--surface-100)",
                      border: `1px solid ${isEmpty ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                      borderRadius: 12, padding: "14px 18px",
                      display: "flex", alignItems: "center", gap: 14,
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--text-950)" }}>
                        {p.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <StockBar qty={p.stock_quantity} min={p.min_stock_alert} />
                        <span style={{
                          fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                          color: isEmpty ? "#EF4444" : "#F59E0B",
                          flexShrink: 0,
                        }}>
                          {p.stock_quantity}/{p.min_stock_alert} mín
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => quickFill(p.id)}
                      style={{
                        marginLeft: "auto",
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 8, border: "none",
                        background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                        color: "#fff",
                        fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      Registrar
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Registrar Produção */}
        <div style={{
          background: "var(--surface-100)",
          border: "1px solid var(--surface-200)",
          borderRadius: 14, padding: "20px 24px", marginBottom: 24,
        }}>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.9px",
            color: "var(--text-300)", marginBottom: 14,
          }}>
            Registrar produção
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Search / Select produto */}
            <div className="kitchen-search-wrap" style={{ flex: 1, minWidth: 140, position: "relative" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--surface-50)",
                border: `1px solid ${selectedProduct ? "rgba(200,155,60,0.4)" : "var(--surface-200)"}`,
                borderRadius: 9, padding: "0 12px",
              }}>
                <Search size={12} strokeWidth={1.8} style={{ color: "var(--text-300)", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={selectedProduct ? selectedProduct.name : "Buscar produto..."}
                  value={selectedProduct ? "" : search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedId("") }}
                  onFocus={() => { if (selectedProduct) { setSelectedId(""); setSearch("") } }}
                  style={{
                    flex: 1, fontFamily: "var(--font-ui)", fontSize: 13,
                    color: "var(--text-950)", background: "transparent",
                    border: "none", outline: "none", padding: "11px 0",
                  }}
                />
                {selectedProduct && (
                  <span style={{
                    fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
                    color: "var(--gold-500)", whiteSpace: "nowrap",
                  }}>
                    {selectedProduct.name}
                  </span>
                )}
              </div>

              {/* Dropdown de sugestões */}
              {!selectedProduct && search.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "var(--surface-100)",
                  border: "1px solid var(--surface-200)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 30, maxHeight: 240, overflowY: "auto",
                }}>
                  {filteredProducts.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => { setSelectedId(p.id); setSearch("") }}
                      style={{
                        width: "100%", textAlign: "left",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", border: "none",
                        background: "transparent", cursor: "pointer",
                        fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-950)",
                        transition: "background 100ms",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-50)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                      <span style={{
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: "1 1 auto", minWidth: 0,
                      }}>{p.name}</span>
                      <span style={{
                        fontFamily: "var(--font-ui)", fontSize: 11,
                        color: p.stock_quantity === 0 ? "#EF4444" : p.stock_quantity <= p.min_stock_alert ? "#F59E0B" : "var(--text-300)",
                        fontWeight: 600, flexShrink: 0, marginLeft: 8,
                      }}>
                        {p.stock_quantity} unid
                      </span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p style={{ padding: "12px 14px", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>
                      Nenhum produto encontrado
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="kitchen-qty-row" style={{ display: "flex", gap: 8 }}>
              {/* Quantidade */}
              <input
                ref={qtyRef}
                type="number"
                min="1"
                placeholder="Qtd"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                style={{
                  width: 80, fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700,
                  color: "var(--text-950)",
                  background: "var(--surface-50)",
                  border: "1px solid var(--surface-200)",
                  borderRadius: 9, padding: "0 14px", outline: "none",
                  textAlign: "center",
                }}
              />

              {/* Botão */}
              <button
                onClick={handleRegister}
                disabled={saving || !selectedId || !qty || parseInt(qty) <= 0}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "0 20px", height: 44, borderRadius: 9, border: "none",
                  background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                  color: "#fff",
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", flexShrink: 0,
                  opacity: saving || !selectedId || !qty || parseInt(qty) <= 0 ? 0.4 : 1,
                  transition: "opacity 150ms",
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                {saving ? "Salvando..." : "Registrar"}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#EF4444", marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>

        {/* Produção de hoje */}
        <div>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.9px",
            color: "var(--text-300)", marginBottom: 10,
          }}>
            Produção de hoje
          </p>

          {restockLog.length === 0 ? (
            <div style={{
              background: "var(--surface-100)",
              border: "1px solid var(--surface-200)",
              borderRadius: 14, padding: "32px 24px", textAlign: "center",
            }}>
              <Clock size={24} strokeWidth={1.5} style={{ color: "var(--text-300)", margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-300)" }}>
                Nenhuma produção registrada hoje.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {restockLog.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: "var(--surface-100)",
                    border: "1px solid var(--surface-200)",
                    borderRadius: 11, padding: "12px 18px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: "rgba(16,185,129,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 900, color: "#10B981",
                    }}>
                      +{entry.quantity}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {entry.product?.name ?? "—"}
                    </p>
                    {entry.product?.sku && (
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-300)", marginTop: 1 }}>
                        {entry.product.sku}
                      </p>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", flexShrink: 0 }}>
                    {formatTime(entry.created_at)}
                  </span>
                </div>
              ))}
              <p style={{
                fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)",
                textAlign: "center", marginTop: 6,
              }}>
                Total produzido hoje: {restockLog.reduce((s, r) => s + r.quantity, 0)} unidades
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
