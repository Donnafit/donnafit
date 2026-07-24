import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
    }

    const { id } = await params
    const { actualQuantity, actualQuantityIntegral, actualQuantityBranco } = await request.json()

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
      .select("stock_quantity, rice_stock_mode, rice_stock_integral, rice_stock_branco, name")
      .eq("id", prodRequest.product_id)
      .single()

    if (fetchProductError || !product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    // Marmitas com estoque separado por tipo de arroz não têm a quantidade
    // real em stock_quantity (fica sempre 0 pra esse tipo de produto — ver
    // migration rice_stock_and_combo_items) — a cozinha precisa informar
    // quanto produziu de CADA tipo, e cada quantidade vai pra sua própria
    // coluna (rice_stock_integral / rice_stock_branco).
    if (product.rice_stock_mode === "both") {
      const addIntegral = Number(actualQuantityIntegral) || 0
      const addBranco = Number(actualQuantityBranco) || 0
      if (addIntegral <= 0 && addBranco <= 0) {
        return NextResponse.json(
          { error: "Informe a quantidade real produzida de pelo menos um tipo de arroz." },
          { status: 400 }
        )
      }

      const newIntegral = (product.rice_stock_integral ?? 0) + addIntegral
      const newBranco = (product.rice_stock_branco ?? 0) + addBranco

      const movements = []
      if (addIntegral > 0) {
        movements.push({
          product_id: prodRequest.product_id,
          type: "restock" as const,
          quantity: addIntegral,
          reference_id: prodRequest.id,
          notes: `Produção concluída — cozinha (arroz: integral, +${addIntegral})`,
        })
      }
      if (addBranco > 0) {
        movements.push({
          product_id: prodRequest.product_id,
          type: "restock" as const,
          quantity: addBranco,
          reference_id: prodRequest.id,
          notes: `Produção concluída — cozinha (arroz: branco, +${addBranco})`,
        })
      }
      const { error: movErr } = await supabase.from("stock_movements").insert(movements)
      if (movErr) {
        return NextResponse.json({ error: movErr.message }, { status: 500 })
      }

      const { error: updateProductErr } = await supabase
        .from("products")
        .update({ rice_stock_integral: newIntegral, rice_stock_branco: newBranco })
        .eq("id", prodRequest.product_id)
      if (updateProductErr) {
        return NextResponse.json({ error: updateProductErr.message }, { status: 500 })
      }

      const totalAdded = addIntegral + addBranco
      const { error: updateReqErr } = await supabase
        .from("production_requests")
        .update({ status: "completed", actual_quantity: totalAdded, completed_at: new Date().toISOString() })
        .eq("id", id)
      if (updateReqErr) {
        return NextResponse.json({ error: updateReqErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        productName: product.name,
        added: totalAdded,
        addedIntegral: addIntegral,
        addedBranco: addBranco,
        newRiceIntegral: newIntegral,
        newRiceBranco: newBranco,
      })
    }

    if (!actualQuantity || actualQuantity <= 0) {
      return NextResponse.json({ error: "Informe a quantidade real produzida." }, { status: 400 })
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
