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

        <div className="mt-4 space-y-3 pt-2">
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Total</span>
            <span className="text-xl font-black text-brand-gold">
              {formatCurrency(total())}
            </span>
          </div>
          <Button
            onClick={handleCheckout}
            className="w-full h-14 text-base font-bold rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white"
          >
            Finalizar Pedido →
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
