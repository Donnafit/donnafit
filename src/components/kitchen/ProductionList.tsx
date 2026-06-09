"use client"
import { useState } from "react"
import { Check, ChefHat } from "lucide-react"
import type { OrderWithItems } from "@/types"

interface ProductionItem {
  key: string
  productName: string
  productSku: string | null
  totalQuantity: number
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
        }
      }
      map[key].totalQuantity += item.quantity
    }
  }
  return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity)
}

export function ProductionList({ orders }: Props) {
  const items = aggregateItems(orders)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const done = checked.size
  const total = items.length

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500 flex flex-col items-center justify-center">
        <ChefHat size={48} className="mb-4 text-brand-gold" />
        <p className="font-medium">Nenhum pedido para amanha ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <div className="flex justify-between mb-2">
          <p className="text-sm font-semibold text-gray-300">
            Progresso da producao
          </p>
          <p className="text-sm font-bold text-white">
            {done}/{total} itens
          </p>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-gold rounded-full transition-all duration-300"
            style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {items.map((item) => {
          const isDone = checked.has(item.key)
          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                isDone
                  ? "border-green-500 bg-green-500/10"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600 active:scale-[0.99]"
              }`}
            >
              {/* Checkbox / count */}
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-colors ${
                  isDone
                    ? "bg-green-500 border-green-500"
                    : "bg-gray-700 border-gray-600"
                }`}
              >
                {isDone ? (
                  <Check className="h-6 w-6 text-white" />
                ) : (
                  <span className="text-xl font-black text-white">
                    {item.totalQuantity}
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[18px] font-bold leading-tight ${
                    isDone
                      ? "text-green-400 line-through decoration-green-500"
                      : "text-white"
                  }`}
                >
                  {item.productName}
                </p>
                {item.productSku && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    SKU #{item.productSku}
                  </p>
                )}
              </div>

              {/* Quantity badge */}
              {!isDone && (
                <span className="text-3xl font-black text-brand-gold shrink-0">
                  {item.totalQuantity}x
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Completion state */}
      {done === total && total > 0 && (
        <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-5 text-center">
          <p className="text-green-400 font-black text-xl">
            Producao completa!
          </p>
          <p className="text-green-400/70 text-sm mt-1">
            Todos os itens foram marcados como produzidos.
          </p>
        </div>
      )}
    </div>
  )
}
