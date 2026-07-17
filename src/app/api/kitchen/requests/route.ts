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
    const { productId, quantity } = await request.json()

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Produto e quantidade são obrigatórios." }, { status: 400 })
    }

    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("name, sku")
      .eq("id", productId)
      .single()

    if (fetchError || !product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const { data: created, error: insertError } = await supabase
      .from("production_requests")
      .insert({ product_id: productId, requested_quantity: quantity })
      .select("id, product_id, requested_quantity, status, created_at")
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ...created,
      product: { name: product.name, sku: product.sku },
    })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
