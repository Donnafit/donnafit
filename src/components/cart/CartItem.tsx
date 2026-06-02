"use client"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import type { CartItem as CartItemType } from "@/types"

export function CartItem({ product, quantity }: CartItemType) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">
          {product.name}
        </p>
        <p className="text-sm text-brand-gold font-bold mt-0.5">
          {formatCurrency(product.price)}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-lg"
          onClick={() => updateQuantity(product.id, quantity - 1)}
        >
          {quantity === 1 ? (
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
        </Button>
        <span className="w-5 text-center text-sm font-bold">{quantity}</span>
        <Button
          size="icon"
          className="h-9 w-9 rounded-lg bg-brand-gold hover:bg-brand-gold-dark text-white"
          onClick={() => updateQuantity(product.id, quantity + 1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="text-sm font-bold w-16 text-right text-gray-900">
        {formatCurrency(product.price * quantity)}
      </p>
    </div>
  )
}
