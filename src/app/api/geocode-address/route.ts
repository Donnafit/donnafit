import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { geocodeAddress } from "@/lib/geocoding"
import { matchDeliveryZone, nearestDeliveryZone } from "@/lib/deliveryZones"

// Só é chamado pelo checkout quando o reconhecimento gratuito por texto
// (matchDeliveryZone contra o próprio endereço digitado) já falhou — evita
// bater no Nominatim a cada tecla digitada.
export async function POST(req: Request) {
  const { address } = await req.json()
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Endereço obrigatório" }, { status: 400 })
  }

  const geocoded = await geocodeAddress(address)
  if (!geocoded) {
    return NextResponse.json({ zone: null })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data: zones } = await supabase.from("delivery_zones").select("name, fee, lat, lng").eq("active", true).order("name")

  let zone = geocoded.bairro ? matchDeliveryZone(geocoded.bairro, zones ?? []) : null
  // Bairro/cidade sem zona cadastrada: usa a taxa da zona mais próxima em
  // vez de recusar — o cliente vê que o frete é uma estimativa, não uma
  // zona identificada com certeza.
  let approximate = false
  if (!zone) {
    zone = nearestDeliveryZone(geocoded.lat, geocoded.lng, zones ?? [])
    approximate = zone !== null
  }

  return NextResponse.json({ zone: zone ?? null, geocodedBairro: geocoded.bairro, approximate })
}
