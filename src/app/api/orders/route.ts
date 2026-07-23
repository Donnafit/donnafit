import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { matchDeliveryZone } from "@/lib/deliveryZones"
import { geocodeToBairro } from "@/lib/geocoding"
import type { Database } from "@/lib/supabase/database.types"
import type { CartItem } from "@/types"
import { MIN_DELIVERY_ITEMS } from "@/hooks/useCart"

type OrderRow = Database["public"]["Tables"]["orders"]["Row"]
type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"]

interface OrderBody {
  customerName: string
  customerPhone: string
  deliveryType: "delivery" | "pickup"
  paymentMethod: "pix" | "card" | "card_link"
  deliveryAddress?: string
  deliveryFee?: number
  items: CartItem[]
  subtotal?: number
  total: number
  riceChoices?: Record<string, "integral" | "branco">
}

export async function POST(req: Request) {
  const body: OrderBody = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  if (!body.customerName?.trim() || !body.customerPhone?.trim() || !body.items?.length) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  // Validar valores permitidos para paymentMethod e deliveryType
  const validPaymentMethods = ["pix", "card", "card_link"]
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

  // Busca os produtos reais no banco — nunca confiar no preço/estoque que o
  // cliente enviou. Também serve pra confirmar que os produtos ainda existem
  // e estão ativos antes de criar o pedido.
  const productIds = [...new Set(body.items.map((item) => item.product.id))]
  const { data: freshProducts, error: productsErr } = await supabase
    .from("products")
    .select("id, name, sku, price, stock_type, is_active, rice_integral_available, rice_stock_mode, rice_stock_integral, rice_stock_branco")
    .in("id", productIds)

  if (productsErr) {
    return NextResponse.json({ error: "Erro ao validar produtos", detail: productsErr.message }, { status: 500 })
  }

  const freshById = new Map<string, any>((freshProducts ?? []).map((p: any) => [p.id, p]))
  const unavailable = body.items.filter((item) => {
    const fresh = freshById.get(item.product.id)
    return !fresh || !fresh.is_active
  })
  if (unavailable.length > 0) {
    return NextResponse.json(
      { error: `Produto(s) indisponível(is): ${unavailable.map((i) => i.product.name).join(", ")}` },
      { status: 409 }
    )
  }

  // Itens "combo" não têm stock_quantity própria — sua composição real
  // (combo_items) é o que define quantas marmitas ela realmente representa
  // (usado no cálculo do frete mínimo abaixo) e, mais adiante, o que baixa
  // de estoque na hora de reservar.
  const comboProductIds = body.items
    .map((item) => item.product.id)
    .filter((id) => freshById.get(id)?.stock_type === "combo")

  const comboItemsByComboId = new Map<string, { component_product_id: string; quantity: number }[]>()
  const componentIds = new Set<string>()
  if (comboProductIds.length > 0) {
    const { data: comboItemsData, error: comboItemsErr } = await supabase
      .from("combo_items")
      .select("combo_product_id, component_product_id, quantity")
      .in("combo_product_id", comboProductIds)

    if (comboItemsErr) {
      return NextResponse.json({ error: "Erro ao validar composição do combo", detail: comboItemsErr.message }, { status: 500 })
    }
    for (const ci of comboItemsData ?? []) {
      const list = comboItemsByComboId.get(ci.combo_product_id) ?? []
      list.push({ component_product_id: ci.component_product_id, quantity: ci.quantity })
      comboItemsByComboId.set(ci.combo_product_id, list)
      componentIds.add(ci.component_product_id)
    }
  }

  // Dados dos componentes de combo (nome + modo de estoque de arroz) —
  // precisos tanto pra baixar o estoque certo (ver stockOps abaixo — um
  // componente "both" mira rice_stock_integral/branco, não stock_quantity,
  // que fica sempre 0 nesse modo) quanto pra apontar no erro qual marmita
  // específica está esgotada, em vez do nome do combo inteiro.
  const componentInfoById = new Map<string, any>()
  if (componentIds.size > 0) {
    const { data: componentsData, error: componentsErr } = await supabase
      .from("products")
      .select("id, name, rice_stock_mode")
      .in("id", [...componentIds])
    if (componentsErr) {
      return NextResponse.json({ error: "Erro ao validar componentes do combo", detail: componentsErr.message }, { status: 500 })
    }
    for (const c of componentsData ?? []) componentInfoById.set(c.id, c)
  }

  // Quantidade real de marmitas por item: um combo conta pelas marmitas que
  // ele realmente contém (soma dos componentes cadastrados), não como 1
  // unidade — senão o mínimo de frete fica incorreto pra pedidos com combo.
  // Combo sem composição cadastrada conta como 1 (mesmo comportamento
  // anterior), pra não travar o pedido por um problema de cadastro.
  const marmitasCount = (item: (typeof body.items)[number]): number => {
    const fresh = freshById.get(item.product.id)
    if (fresh?.stock_type !== "combo") return item.quantity
    const components = comboItemsByComboId.get(item.product.id) ?? []
    if (components.length === 0) return item.quantity
    const perCombo = components.reduce((sum, c) => sum + c.quantity, 0)
    return perCombo * item.quantity
  }

  // Mesmo princípio de nunca confiar só na validação do front — o carrinho
  // já bloqueia entrega abaixo do mínimo, mas isso é só cosmético sem essa
  // checagem espelhada aqui.
  const totalQty = body.items.reduce((sum, item) => sum + marmitasCount(item), 0)
  if (body.deliveryType === "delivery" && totalQty < MIN_DELIVERY_ITEMS) {
    return NextResponse.json(
      { error: `Frete disponível apenas a partir de ${MIN_DELIVERY_ITEMS} marmitas` },
      { status: 400 }
    )
  }

  // Frete real por bairro — reconhecido a partir do texto do endereço, nunca
  // confiando no valor que o cliente envia (mesmo padrão de integridade já
  // usado para preço/estoque de produto). O cliente nunca escolhe o bairro
  // manualmente, então isso também é a única fonte de verdade, não só uma
  // checagem contra manipulação.
  let deliveryFee = 0
  if (body.deliveryType === "delivery") {
    const { data: activeZones } = await supabase
      .from("delivery_zones")
      .select("name, fee")
      .eq("active", true)
      .order("name")
    let zone = matchDeliveryZone(body.deliveryAddress!, activeZones ?? [])
    if (!zone) {
      // Endereço sem o nome do bairro escrito — tenta resolver via geocoding
      // (mesmo fallback usado no checkout) antes de recusar o pedido.
      const geocodedBairro = await geocodeToBairro(body.deliveryAddress!)
      if (geocodedBairro) zone = matchDeliveryZone(geocodedBairro, activeZones ?? [])
    }
    if (!zone) {
      return NextResponse.json({ error: "Não foi possível identificar o bairro no endereço informado" }, { status: 400 })
    }
    deliveryFee = Number(zone.fee)
  }

  // Recalcular totais no servidor a partir do preço REAL do banco — nunca
  // confiar nos valores enviados pelo cliente.
  const calculatedSubtotal = body.items.reduce(
    (sum, item) => sum + freshById.get(item.product.id).price * item.quantity,
    0
  )
  let pixDiscountRate = 0
  if (body.paymentMethod === "pix") {
    const { data: settings } = await supabase
      .from("store_settings")
      .select("pix_discount_rate")
      .eq("id", "default")
      .single()
    pixDiscountRate = Number(settings?.pix_discount_rate ?? 0.02)
  }
  const pixDiscount = calculatedSubtotal * pixDiscountRate
  const calculatedTotal = calculatedSubtotal - pixDiscount + deliveryFee

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const deliveryDate = tomorrow.toISOString().split("T")[0]

  // Força "Branco" pra pratos sem opção integral, mesmo que o cliente
  // tenha mandado "integral" — mesmo princípio de nunca confiar em
  // escolha que devia ser travada no servidor.
  const riceNotes = Object.entries(body.riceChoices ?? {})
    .map(([productId, choice]) => {
      const item = body.items.find(i => i.product.id === productId)
      const fresh = freshById.get(productId)
      const finalChoice = fresh && !fresh.rice_integral_available ? "branco" : choice
      return `${item?.product.name ?? productId}: Arroz ${finalChoice === "integral" ? "Integral" : "Branco"}`
    })
    .join(" | ")

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
    notes: riceNotes || null,
  }

  // First attempt: full payload including delivery_address
  let { data: order, error: orderErr } = (await supabase
    .from("orders")
    .insert(insertPayload)
    .select()
    .single()) as { data: OrderRow | null; error: unknown }

  // If the column does not exist yet, retry without delivery_address
  const orderErrMsg = (orderErr as any)?.message ?? ""
  if (orderErr && (orderErrMsg.includes("column") || orderErrMsg.includes("delivery_address"))) {
    console.warn("delivery_address column missing — retrying without it:", orderErrMsg)
    const { delivery_address: _omit, ...payloadWithoutAddress } = insertPayload as any
    const retryResult = (await supabase
      .from("orders")
      .insert(payloadWithoutAddress)
      .select()
      .single()) as { data: OrderRow | null; error: unknown }
    order = retryResult.data
    orderErr = retryResult.error
  }

  if (orderErr || !order) {
    const detail = (orderErr as any)?.message ?? "unknown error"
    console.error("Order insert error:", orderErr)
    return NextResponse.json(
      { error: "Erro ao criar pedido", detail },
      { status: 500 }
    )
  }

  // Cada item do pedido vira uma ou mais "operações de estoque". Um item
  // comum vira 1 operação simples (mira stock_quantity); um item com
  // estoque dividido por tipo de arroz (rice_stock_mode === "both") vira
  // 1 operação "rice" (mira rice_stock_integral ou rice_stock_branco,
  // conforme a escolha do cliente). Itens "combo" ganham uma expansão
  // própria em componentes — ver Task 3.
  interface StockOp {
    kind: "simple" | "rice"
    productId: string
    quantity: number
    riceType?: "integral" | "branco"
    label: string
  }

  function buildRiceOp(item: (typeof body.items)[number]): StockOp {
    const requested = body.riceChoices?.[item.product.id]
    // Mesmo princípio de nunca confiar em escolha que devia ser travada
    // no servidor — já usado acima pras notas do pedido (riceNotes).
    const riceType: "integral" | "branco" = requested === "integral" ? "integral" : "branco"
    return { kind: "rice", productId: item.product.id, quantity: item.quantity, riceType, label: item.product.name }
  }

  // Itens "combo" não têm stock_quantity própria — a baixa mira cada
  // componente individual (combo_items, já buscados acima), multiplicando a
  // quantidade do componente pela quantidade do combo no pedido.
  const stockOps: StockOp[] = body.items.flatMap((item) => {
    const fresh = freshById.get(item.product.id)
    if (fresh.stock_type === "combo") {
      const components = comboItemsByComboId.get(item.product.id) ?? []
      if (components.length === 0) {
        // Combo sem composição cadastrada ainda (migração manual — ver
        // Task 6 do plano): nenhuma operação de estoque é gerada pra
        // ele, ou seja, essa venda NÃO baixa estoque de ninguém. É
        // esperado até a composição ser configurada, mas fica logado
        // pra ficar visível em produção.
        console.warn(`Combo ${item.product.id} (${item.product.name}) sem combo_items configurados — venda não baixou estoque de nenhum componente.`)
      }
      return components.map((comp) => {
        const componentInfo = componentInfoById.get(comp.component_product_id)
        const quantity = comp.quantity * item.quantity
        const label = componentInfo?.name ?? item.product.name
        // Componente com estoque dividido por tipo de arroz (rice_stock_mode
        // "both") não usa stock_quantity — essa coluna fica sempre em 0
        // nesse modo (ver EstoqueClient.tsx), então mirar reserve_stock nele
        // sempre falhava com "estoque insuficiente" mesmo com arroz de
        // sobra (causa real do combo aparecendo esgotado no checkout). Não
        // existe hoje escolha de tipo de arroz por componente de combo no
        // checkout, então assume "branco" — mesmo default usado quando o
        // cliente não escolhe explicitamente em outros pontos deste arquivo.
        if (componentInfo?.rice_stock_mode === "both") {
          return {
            kind: "rice" as const,
            productId: comp.component_product_id,
            quantity,
            riceType: "branco" as const,
            label,
          }
        }
        return { kind: "simple" as const, productId: comp.component_product_id, quantity, label }
      })
    }
    if (fresh.rice_stock_mode === "both") return [buildRiceOp(item)]
    return [{ kind: "simple" as const, productId: item.product.id, quantity: item.quantity, label: item.product.name }]
  })

  // Reserva o estoque de TODAS as operações (antes só "combo" era checado
  // — "avulso" podia vender infinitamente além do estoque real). Atômico
  // no banco: se duas requisições concorrentes disputam a última
  // unidade, só uma consegue.
  const reserveOp = (op: StockOp, quantity: number) => {
    return op.kind === "rice"
      ? supabase.rpc("reserve_rice_stock", { p_product_id: op.productId, p_rice_type: op.riceType, p_quantity: quantity, p_order_id: order.id })
      : supabase.rpc("reserve_stock", { p_product_id: op.productId, p_quantity: quantity, p_order_id: order.id })
  }

  const reserveResults = await Promise.allSettled(stockOps.map((op) => reserveOp(op, op.quantity)))
  const failedOps = reserveResults
    .map((r, i) => ({ r, op: stockOps[i] }))
    .filter(({ r }) => r.status === "rejected" || (r as PromiseFulfilledResult<any>).value?.error)

  if (failedOps.length > 0) {
    // Desfaz as reservas que deram certo, pra não vazar estoque, e cancela o pedido.
    const succeededOps = stockOps.filter((_, i) => {
      const r = reserveResults[i]
      return r.status === "fulfilled" && !(r as PromiseFulfilledResult<any>).value?.error
    })
    await Promise.allSettled(succeededOps.map((op) => reserveOp(op, -op.quantity)))
    await supabase.from("orders").delete().eq("id", order.id)

    return NextResponse.json(
      { error: `Estoque insuficiente para: ${[...new Set(failedOps.map(({ op }) => op.label))].join(", ")}` },
      { status: 409 }
    )
  }

  const itemsPayload: OrderItemInsert[] = body.items.map((item) => {
    const fresh = freshById.get(item.product.id)
    return {
      order_id: order.id,
      product_id: item.product.id,
      product_name: fresh.name,
      product_sku: fresh.sku,
      quantity: item.quantity,
      unit_price: fresh.price,
    }
  })

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

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
  })
}
