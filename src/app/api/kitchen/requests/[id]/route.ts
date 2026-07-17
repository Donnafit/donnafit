import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireStaff())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
    }

    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any

    const { error } = await supabase
      .from("production_requests")
      .delete()
      .eq("id", id)
      .eq("status", "pending")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
