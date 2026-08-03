// Fallback gratuito via Nominatim (OpenStreetMap) — só é chamado quando o
// reconhecimento por substring (matchDeliveryZone) não encontra nenhum
// bairro no texto digitado. Sem chave de API, sem custo.
//
// ponytail: instância pública do Nominatim, limite de ~1 req/s e uso
// esporádico (só quando o match grátis falha, nunca a cada tecla digitada).
// Se o volume de pedidos crescer muito, trocar por instância própria.

import { stripAddressComplement } from "./addressComplement"

interface NominatimResult {
  lat: string
  lon: string
  address?: {
    suburb?: string
    neighbourhood?: string
    city_district?: string
  }
}

export interface GeocodeResult {
  bairro: string | null
  lat: number
  lng: number
}

/**
 * Resolve o endereço digitado via Nominatim — devolve o nome de bairro (se
 * vier algum campo reconhecível) e as coordenadas, usadas como fallback pra
 * achar a zona cadastrada mais próxima quando nenhum bairro exato bate (ver
 * nearestDeliveryZone em deliveryZones.ts). Retorna null se a busca falhar
 * ou não vier nenhum resultado.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address.trim()) return null

  // Não fixamos a cidade em "Curitiba" aqui: endereços de cidades vizinhas
  // (Pinhais, Colombo, Almirante Tamandaré, São José dos Pinhais...) sem o
  // bairro escrito caíam sempre num resultado dentro de Curitiba, mesmo
  // quando a rua também existe (ou só existe) em outro município da região
  // — o texto digitado pelo cliente já carrega a cidade certa quando ele a
  // escreve; forçar "Curitiba" sobrescrevia isso. Mantemos só o estado (PR)
  // como escopo, o suficiente pra evitar que a busca vá parar noutro estado.
  const query = `${stripAddressComplement(address)}, PR, Brasil`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&countrycodes=br&limit=1`

  // Sem timeout, uma instância pública lenta/instável do Nominatim podia
  // deixar POST /api/orders pendurado indefinidamente — e, por tabela, o
  // botão "Confirmar e Abrir WhatsApp" travado em loading pra sempre, já
  // que o fetch do checkout nunca resolvia nem rejeitava.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DonnaFIT-Checkout/1.0 (contato: donnafit)" },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) return null
    const results: NominatimResult[] = await res.json()
    const first = results[0]
    if (!first) return null

    const address_ = first.address
    const bairro = address_?.suburb ?? address_?.neighbourhood ?? address_?.city_district ?? null
    return { bairro, lat: Number(first.lat), lng: Number(first.lon) }
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Mantido pra quem só precisa do nome do bairro (sem coordenadas). */
export async function geocodeToBairro(address: string): Promise<string | null> {
  const result = await geocodeAddress(address)
  return result?.bairro ?? null
}
