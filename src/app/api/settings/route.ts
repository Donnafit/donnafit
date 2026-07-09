import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth"

export async function PATCH(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const body = await req.json()

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.storeName !== undefined) update.store_name = body.storeName
  if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp
  if (body.openHour !== undefined) update.open_hour = body.openHour
  if (body.closeHour !== undefined) update.close_hour = body.closeHour
  if (body.orderSound !== undefined) update.order_sound = body.orderSound

  const { error } = await supabase.from("store_settings").update(update).eq("id", "default")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
