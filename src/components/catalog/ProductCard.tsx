"use client"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StockBadge } from "./StockBadge"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import type { Product } from "@/types"

interface Props {
  product: Product
}

export function ProductCard({ product }: Props) {
  const { items, addItem, updateQuantity } = useCart()
  const cartItem = items.find((i) => i.product.id === product.id)
  const qty = cartItem?.quantity ?? 0
  const soldOut = !product.is_active || product.stock_quantity <= 0

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 ${
        soldOut ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 leading-tight text-sm">
            {product.name}
          </p>
          {product.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <StockBadge
            stockQuantity={product.stock_quantity}
            minAlert={product.min_stock_alert}
            isActive={product.is_active}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-base font-bold text-brand-gold">
          {formatCurrency(product.price)}
        </span>

        {soldOut ? (
          <span className="text-sm text-gray-400">Indisponível</span>
        ) : qty === 0 ? (
          <Button
            size="sm"
            onClick={() => addItem(product)}
            className="bg-brand-gold hover:bg-brand-gold-dark text-white rounded-xl min-h-[44px] px-4"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => updateQuantity(product.id, qty - 1)}
              className="h-11 w-11 rounded-xl border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-bold text-gray-900">
              {qty}
            </span>
            <Button
              size="icon"
              onClick={() => addItem(product)}
              className="h-11 w-11 rounded-xl bg-brand-gold hover:bg-brand-gold-dark text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
