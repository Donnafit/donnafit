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
  deliveryAddress?: string
  deliveryFee?: number
  items: CartItem[]
  subtotal?: number
  total: number
}

export async function POST(req: Request) {
  const body: OrderBody = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  if (!body.customerName?.trim() || !body.customerPhone?.trim() || !body.items?.length) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  // Validar valores permitidos para paymentMethod e deliveryType
  const validPaymentMethods = ["pix", "card"]
  const validDeliveryTypes = ["delivery", "pickup"]

  if (!validPaymentMethods.includes(body.paymentMethod)) {
    return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 })
  }
  if (!validDeliveryTypes.includes(body.deliveryType)) {
    return NextResponse.json({ error: "Tipo de entrega inválido" }, { status: 400 })
  }

  // Validar que todos os itens têm quantidade positiva
  if (body.items.some((item) => !item.quantity || item.quantity <= 0)) {
    return NextResponse.json({ error: "Quantidade inválida nos itens" }, { status: 400 })
  }

  if (body.deliveryType === "delivery" && !body.deliveryAddress?.trim()) {
    return NextResponse.json({ error: "Endereço de entrega obrigatório" }, { status: 400 })
  }

  // Remover máscara do telefone antes de salvar
  const cleanPhone = body.customerPhone.replace(/\D/g, "")

  // Recalcular totais no servidor — nunca confiar nos valores enviados pelo cliente
  const calculatedSubtotal = body.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  const pixDiscount = body.paymentMethod === "pix" ? calculatedSubtotal * 0.05 : 0
  const deliveryFee = body.deliveryType === "delivery" ? (body.deliveryFee ?? 0) : 0
  const calculatedTotal = calculatedSubtotal - pixDiscount + deliveryFee

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const deliveryDate = tomorrow.toISOString().split("T")[0]

  const insertPayload: Database["public"]["Tables"]["orders"]["Insert"] = {
    customer_name: body.customerName.trim(),
    customer_phone: cleanPhone,
    delivery_type: body.deliveryType,
    payment_method: body.paymentMethod,
    delivery_address: body.deliveryAddress?.trim() ?? null,
    status: "pending",
    subtotal: calculatedSubtotal,
    total: calculatedTotal,
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

  // ── Upsert de perfil do cliente ──────────────────────────────────────
  try {
    // Extrai category_ids únicos dos itens do pedido
    const categoryIds = Array.from(new Set(
      body.items
        .map(i => i.product.category_id)
        .filter(Boolean)
    )) as string[]

    // Busca perfil existente para mesclar preferências
    const { data: existing } = await supabase
      .from("customer_profiles")
      .select("preferred_categories, preferred_products, total_orders, total_spent")
      .eq("phone", cleanPhone)
      .maybeSingle()

    // Mescla preferências de categorias (JSONB com contagem)
    const existingCats: Array<{ category_id: string; count: number }> =
      (existing?.preferred_categories as any[]) ?? []
    const catMap = new Map(existingCats.map(c => [c.category_id, c.count]))
    for (const id of categoryIds) {
      catMap.set(id, (catMap.get(id) ?? 0) + 1)
    }
    const updatedCats = [...catMap.entries()]
      .map(([category_id, count]) => ({ category_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // Mescla preferências de produtos (JSONB com contagem)
    const existingProds: Array<{ product_id: string; product_name: string; count: number }> =
      (existing?.preferred_products as any[]) ?? []
    const prodMap = new Map(existingProds.map(p => [p.product_id, { product_name: p.product_name, count: p.count }]))
    for (const item of body.items) {
      const prev = prodMap.get(item.product.id)
      prodMap.set(item.product.id, {
        product_name: item.product.name,
        count: (prev?.count ?? 0) + item.quantity,
      })
    }
    const updatedProds = [...prodMap.entries()]
      .map(([product_id, { product_name, count }]) => ({ product_id, product_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    await supabase.from("customer_profiles").upsert(
      {
        phone: cleanPhone,
        name: body.customerName.trim(),
        preferred_delivery: body.deliveryType,
        preferred_payment: body.paymentMethod,
        preferred_categories: updatedCats,
        preferred_products: updatedProds,
        total_orders: (existing?.total_orders ?? 0) + 1,
        total_spent: Number(existing?.total_spent ?? 0) + calculatedTotal,
        last_order_at: new Date().toISOString(),
      },
      { onConflict: "phone" }
    )
  } catch (profileErr) {
    // Não falha o pedido se o perfil não salvar
    console.error("Customer profile upsert error:", profileErr)
  }
  // ────────────────────────────────────────────────────────────────────

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
