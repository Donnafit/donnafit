"use client"
import { useState } from "react"
import { ShoppingBag } from "lucide-react"
import { CartDrawer } from "./CartDrawer"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"

export function CartBar() {
  const [open, setOpen] = useState(false)
  const { count, total } = useCart()

  if (count() === 0) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 p-4 z-20 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-between h-14 rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white px-5 shadow-lg transition-colors"
          >
            <span className="flex items-center gap-2 font-bold">
              <ShoppingBag className="h-5 w-5" />
              {count()} {count() === 1 ? "item" : "itens"}
            </span>
            <span className="font-bold text-base">{formatCurrency(total())}</span>
          </button>
        </div>
      </div>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
