import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any
    const { productId, quantity, notes } = await request.json()

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Produto e quantidade são obrigatórios." }, { status: 400 })
    }

    // 1. Lê estoque atual
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock_quantity, name")
      .eq("id", productId)
      .single()

    if (fetchError || !product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const newQuantity = product.stock_quantity + quantity

    // 2. Registra movimentação de reposição
    const { error: movErr } = await supabase
      .from("stock_movements")
      .insert({
        product_id: productId,
        type:       "restock" as const,
        quantity,
        notes:      notes ?? `Produção manual — cozinha (+${quantity})`,
      })

    if (movErr) {
      return NextResponse.json({ error: movErr.message }, { status: 500 })
    }

    // 3. Atualiza stock_quantity do produto
    const { error: updateErr } = await supabase
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("id", productId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success:      true,
      productName:  product.name,
      added:        quantity,
      newQuantity,
    })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
