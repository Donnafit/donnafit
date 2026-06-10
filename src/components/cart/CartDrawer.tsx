"use client"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CartItem } from "./CartItem"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, total } = useCart()
  const router = useRouter()

  function handleCheckout() {
    onClose()
    router.push("/checkout")
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] flex flex-col px-4 pb-6"
      >
        <SheetHeader className="text-left pt-2">
          <SheetTitle className="text-lg font-bold">Seu pedido</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-3">
          {items.map((item) => (
            <CartItem key={item.product.id} {...item} />
          ))}
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0EDE8" }}>
          {/* Subtotal */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#888" }}>Subtotal</span>
            <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 20, color: "#1A1A1A" }}>
              {formatCurrency(total())}
            </span>
          </div>
          {/* Entrega */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#888" }}>Entrega</span>
            <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, fontWeight: 600, color: "#C89B3C" }}>a calcular</span>
          </div>
          <button
            onClick={handleCheckout}
            style={{
              width: "100%", height: 52,
              background: "linear-gradient(135deg, #5A6B2A 0%, #7B9238 100%)",
              color: "#fff", border: "none", borderRadius: 14,
              fontFamily: "var(--font-switzer), sans-serif",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              boxShadow: "0 6px 20px rgba(90,107,42,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            Finalizar Pedido
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
