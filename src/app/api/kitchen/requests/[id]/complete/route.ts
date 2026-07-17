import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
    }

    const { id } = await params
    const { actualQuantity } = await request.json()

    if (!actualQuantity || actualQuantity <= 0) {
      return NextResponse.json({ error: "Informe a quantidade real produzida." }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any

    const { data: prodRequest, error: fetchReqError } = await supabase
      .from("production_requests")
      .select("id, product_id, status")
      .eq("id", id)
      .single()

    if (fetchReqError || !prodRequest) {
      return NextResponse.json({ error: "Pedido de produção não encontrado." }, { status: 404 })
    }
    if (prodRequest.status !== "pending") {
      return NextResponse.json({ error: "Esse pedido já foi concluído." }, { status: 409 })
    }

    const { data: product, error: fetchProductError } = await supabase
      .from("products")
      .select("stock_quantity, name")
      .eq("id", prodRequest.product_id)
      .single()

    if (fetchProductError || !product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const newQuantity = product.stock_quantity + actualQuantity

    const { error: movErr } = await supabase
      .from("stock_movements")
      .insert({
        product_id: prodRequest.product_id,
        type: "restock" as const,
        quantity: actualQuantity,
        reference_id: prodRequest.id,
        notes: `Produção concluída — cozinha (+${actualQuantity})`,
      })
    if (movErr) {
      return NextResponse.json({ error: movErr.message }, { status: 500 })
    }

    const { error: updateProductErr } = await supabase
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("id", prodRequest.product_id)
    if (updateProductErr) {
      return NextResponse.json({ error: updateProductErr.message }, { status: 500 })
    }

    const { error: updateReqErr } = await supabase
      .from("production_requests")
      .update({ status: "completed", actual_quantity: actualQuantity, completed_at: new Date().toISOString() })
      .eq("id", id)
    if (updateReqErr) {
      return NextResponse.json({ error: updateReqErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      productName: product.name,
      added: actualQuantity,
      newQuantity,
    })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
