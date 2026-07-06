import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth"

export async function POST(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const body = await req.json()

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({ text: body.text.trim(), is_active: true, sort_order: body.sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const body = await req.json()

  if (!body.id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.text !== undefined) update.text = body.text.trim()
  if (body.is_active !== undefined) update.is_active = body.is_active
  if (body.sort_order !== undefined) update.sort_order = body.sort_order

  const { error } = await supabase.from("announcements").update(update).eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const { error } = await supabase.from("announcements").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
