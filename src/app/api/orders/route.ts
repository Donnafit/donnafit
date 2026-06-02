import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"
import type { CartItem } from "@/types"

type OrderRow = Database["public"]["Tables"]["orders"]["Row"]
type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"]

interface OrderBody {
  customerName: string
  customerPhone: string
  deliveryType: "delivery" | "pickup"
  paymentMethod: "pix" | "card"
  items: CartItem[]
  total: number
}

export async function POST(req: Request) {
  const body: OrderBody = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  if (!body.customerName?.trim() || !body.customerPhone?.trim() || !body.items?.length) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const deliveryDate = tomorrow.toISOString().split("T")[0]

  const insertPayload: Database["public"]["Tables"]["orders"]["Insert"] = {
    customer_name: body.customerName.trim(),
    customer_phone: body.customerPhone.trim(),
    delivery_type: body.deliveryType,
    payment_method: body.paymentMethod,
    status: "pending",
    subtotal: body.total,
    total: body.total,
    delivery_date: deliveryDate,
  }

  const { data: order, error: orderErr } = (await supabase
    .from("orders")
    .insert(insertPayload)
    .select()
    .single()) as { data: OrderRow | null; error: Error | null }

  if (orderErr || !order) {
    console.error("Order insert error:", orderErr)
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 })
  }

  const itemsPayload: OrderItemInsert[] = body.items.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    product_name: item.product.name,
    product_sku: item.product.sku,
    quantity: item.quantity,
    unit_price: item.product.price,
  }))

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemsPayload)

  if (itemsErr) {
    console.error("Order items error:", itemsErr)
  }

  // Reserve stock for combo items
  const comboItems = body.items.filter((i) => i.product.stock_type === "combo")
  if (comboItems.length > 0) {
    await Promise.allSettled(
      comboItems.map((item) =>
        supabase.rpc("reserve_stock", {
          p_product_id: item.product.id,
          p_quantity: item.quantity,
          p_order_id: order.id,
        })
      )
    )
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
  })
}
