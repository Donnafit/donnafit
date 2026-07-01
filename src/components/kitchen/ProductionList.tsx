"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChefHat, Loader2, CheckCircle2 } from "lucide-react"
import type { OrderWithItems } from "@/types"

interface ProductionItem {
  key: string
  productName: string
  productSku: string | null
  totalQuantity: number
  // Para chamar deduct_stock por pedido
  orderItems: { orderId: string; productId: string | null; quantity: number }[]
}

interface Props {
  orders: OrderWithItems[]
}

function aggregateItems(orders: OrderWithItems[]): ProductionItem[] {
  const map: Record<string, ProductionItem> = {}
  for (const order of orders) {
    for (const item of order.order_items) {
      const key = item.product_id ?? item.product_name
      if (!map[key]) {
        map[key] = {
          key,
          productName: item.product_name,
          productSku: item.product_sku,
          totalQuantity: 0,
          orderItems: [],
        }
      }
      map[key].totalQuantity += item.quantity
      map[key].orderItems.push({
        orderId:   order.id,
        productId: item.product_id,
        quantity:  item.quantity,
      })
    }
  }
  return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity)
}

export function ProductionList({ orders }: Props) {
  const router = useRouter()
  const items  = aggregateItems(orders)
  const orderIds = orders.map((o) => o.id)

  const [checked,    setChecked]    = useState<Set<string>>(new Set())
  const [finalizing, setFinalizing] = useState(false)
  const [finalized,  setFinalized]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function toggle(key: string) {
    if (finalized) return
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleFinalize() {
    setFinalizing(true)
    setError(null)
    try {
      // Monta a lista de items por pedido para o deduct_stock
      const orderItems = items.flatMap((item) => item.orderItems)

      const res = await fetch("/api/kitchen/finalize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orderIds, orderItems }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao finalizar produção.")
      setFinalized(true)
      // Recarrega a página para refletir os novos status no banco
      setTimeout(() => router.refresh(), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao finalizar produção.")
    } finally {
      setFinalizing(false)
    }
  }

  const done     = checked.size
  const total    = items.length
  const pct      = total ? Math.round((done / total) * 100) : 0
  const allDone  = done === total && total > 0

  if (items.length === 0) {
    return (
      <div style={{
        background: "var(--surface-100)",
        borderRadius: 16, padding: "48px 24px", textAlign: "center",
        border: "1px solid var(--surface-200)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(200,155,60,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ChefHat size={22} strokeWidth={1.5} style={{ color: "var(--gold-500)" }} />
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-300)", fontWeight: 500 }}>
          Nenhum pedido para produção.
        </p>
      </div>
    )
  }

  if (finalized) {
    return (
      <div style={{
        background: "rgba(16,185,129,0.06)",
        border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: 16, padding: "48px 24px", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        <CheckCircle2 size={48} strokeWidth={1.5} style={{ color: "#10B981" }} />
        <div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 900, color: "#10B981" }}>
            Produção finalizada!
          </p>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(16,185,129,0.7)", marginTop: 6 }}>
            {orderIds.length} pedido(s) marcado(s) como prontos. Estoque atualizado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Barra de progresso */}
      <div style={{
        background: "var(--surface-100)",
        border: "1px solid var(--surface-200)",
        borderRadius: 14, padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
            color: "var(--text-500)", textTransform: "uppercase", letterSpacing: "0.6px",
          }}>
            Progresso da produção
          </p>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
            color: allDone ? "#10B981" : "var(--text-950)",
          }}>
            {done}/{total} itens · {pct}%
          </p>
        </div>
        <div style={{ height: 6, background: "var(--surface-200)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 99,
            background: allDone
              ? "linear-gradient(90deg, #10B981, #34D399)"
              : "linear-gradient(90deg, var(--gold-500), var(--gold-600))",
            transition: "width 300ms ease, background 400ms",
          }} />
        </div>
      </div>

      {/* Lista de itens */}
      {items.map((item) => {
        const isDone = checked.has(item.key)
        return (
          <button
            key={item.key}
            onClick={() => toggle(item.key)}
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 20px", borderRadius: 14,
              border: isDone ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--surface-200)",
              background: isDone ? "rgba(16,185,129,0.05)" : "var(--surface-100)",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "all 180ms",
            }}
          >
            {/* Badge quantidade */}
            <div style={{
              width: 52, height: 52, borderRadius: 13, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isDone ? "#10B981" : "rgba(200,155,60,0.10)",
              border: `1px solid ${isDone ? "transparent" : "rgba(200,155,60,0.2)"}`,
              transition: "all 200ms",
            }}>
              {isDone
                ? <Check size={22} strokeWidth={2.5} style={{ color: "#fff" }} />
                : <span style={{
                    fontFamily: "var(--font-ui)", fontSize: 20, fontWeight: 900,
                    color: "var(--gold-500)", lineHeight: 1,
                  }}>{item.totalQuantity}</span>
              }
            </div>

            {/* Nome e SKU */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, lineHeight: 1.3,
                color: isDone ? "var(--text-300)" : "var(--text-950)",
                textDecoration: isDone ? "line-through" : "none",
                transition: "all 200ms",
              }}>
                {item.productName}
              </p>
              {item.productSku && (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
                  SKU #{item.productSku}
                </p>
              )}
            </div>

            {/* Quantidade direita / pill pronto */}
            {!isDone ? (
              <span style={{
                fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 900,
                color: "var(--gold-500)", flexShrink: 0, lineHeight: 1,
              }}>
                {item.totalQuantity}×
              </span>
            ) : (
              <span style={{
                fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                color: "#10B981", background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 99, padding: "3px 10px", flexShrink: 0,
              }}>
                Pronto
              </span>
            )}
          </button>
        )
      })}

      {/* Erro */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 12, padding: "12px 16px",
        }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {/* Botão finalizar — aparece quando tudo está marcado */}
      {allDone && (
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "16px 24px", borderRadius: 14, border: "none", cursor: "pointer",
            background: finalizing
              ? "rgba(16,185,129,0.5)"
              : "linear-gradient(135deg, #10B981, #059669)",
            color: "#fff",
            fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 800,
            boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
            transition: "opacity 200ms",
            opacity: finalizing ? 0.7 : 1,
          }}
        >
          {finalizing
            ? <><Loader2 size={18} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> Finalizando...</>
            : <><CheckCircle2 size={18} strokeWidth={2} /> Finalizar Produção — {orderIds.length} pedido(s)</>
          }
        </button>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
