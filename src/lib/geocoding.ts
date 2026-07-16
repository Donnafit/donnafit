// Fallback gratuito via Nominatim (OpenStreetMap) — só é chamado quando o
// reconhecimento por substring (matchDeliveryZone) não encontra nenhum
// bairro no texto digitado. Sem chave de API, sem custo.
//
// ponytail: instância pública do Nominatim, limite de ~1 req/s e uso
// esporádico (só quando o match grátis falha, nunca a cada tecla digitada).
// Se o volume de pedidos crescer muito, trocar por instância própria.

import { stripAddressComplement } from "./addressComplement"

interface NominatimResult {
  address?: {
    suburb?: string
    neighbourhood?: string
    city_district?: string
  }
}

/**
 * Resolve o endereço digitado pra um nome de bairro usando o Nominatim.
 * Retorna null se a busca falhar ou não vier nenhum campo de bairro.
 */
export async function geocodeToBairro(address: string): Promise<string | null> {
  if (!address.trim()) return null

  const query = `${stripAddressComplement(address)}, Curitiba, PR, Brasil`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&countrycodes=br&limit=1`

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DonnaFIT-Checkout/1.0 (contato: donnafit)" },
      cache: "no-store",
    })
    if (!res.ok) return null
    const results: NominatimResult[] = await res.json()
    const address_ = results[0]?.address
    if (!address_) return null

    return address_.suburb ?? address_.neighbourhood ?? address_.city_district ?? null
  } catch {
    return null
  }
}
