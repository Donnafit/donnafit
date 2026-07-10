import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { geocodeToBairro } from "@/lib/geocoding"
import { matchDeliveryZone } from "@/lib/deliveryZones"

// Só é chamado pelo checkout quando o reconhecimento gratuito por texto
// (matchDeliveryZone contra o próprio endereço digitado) já falhou — evita
// bater no Nominatim a cada tecla digitada.
export async function POST(req: Request) {
  const { address } = await req.json()
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Endereço obrigatório" }, { status: 400 })
  }

  const geocodedBairro = await geocodeToBairro(address)
  if (!geocodedBairro) {
    return NextResponse.json({ zone: null })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data: zones } = await supabase.from("delivery_zones").select("name, fee").eq("active", true)
  const zone = matchDeliveryZone(geocodedBairro, zones ?? [])

  return NextResponse.json({ zone: zone ?? null, geocodedBairro })
}
