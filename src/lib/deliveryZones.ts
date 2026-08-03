import { stripAddressComplement } from "./addressComplement"

export interface DeliveryZone {
  name: string
  fee: number
  lat?: number | null
  lng?: number | null
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
}

/**
 * Reconhece o bairro dentro de um endereço digitado livremente, escolhendo o
 * nome de zona mais específico (mais longo) que aparece no texto — evita que
 * "Alto Boqueirão" seja identificado como "Boqueirão" por engano.
 */
export function matchDeliveryZone(address: string, zones: DeliveryZone[]): DeliveryZone | null {
  const normalizedAddress = normalize(stripAddressComplement(address))

  // "Atuba" existe em Curitiba (bairro) e em Colombo (localidade homônima) —
  // único caso de ambiguidade real na lista; desempata pela cidade citada.
  const hasColombo = normalizedAddress.includes("colombo")
  const hasAtuba = normalizedAddress.includes("atuba")
  if (hasAtuba && hasColombo) {
    const colomboZone = zones.find((z) => normalize(z.name) === normalize("Atuba (Colombo)"))
    if (colomboZone) return colomboZone
  }

  // Não removemos o sufixo "(Colombo)" do nome aqui: como ninguém digita
  // literalmente "(Colombo)" com parênteses no endereço, "Atuba (Colombo)"
  // nunca bate por substring neste loop genérico — só pelo caso especial
  // acima. Removê-lo (como uma versão anterior fazia) igualava o nome
  // normalizado de "Atuba (Colombo)" ao de "Atuba", fazendo a escolha
  // depender da ordem de iteração e, sem "Colombo" no endereço, às vezes
  // escolher a zona errada (Colombo em vez de Curitiba).
  let best: DeliveryZone | null = null
  let bestNormalizedLength = -1
  for (const zone of zones) {
    const normalizedName = normalize(zone.name)
    if (normalizedName && normalizedAddress.includes(normalizedName) && normalizedName.length > bestNormalizedLength) {
      best = zone
      bestNormalizedLength = normalizedName.length
    }
  }
  return best
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Usado só quando o endereço não bate com nenhuma zona cadastrada — nem por
 * nome direto (matchDeliveryZone) nem pelo bairro que o geocoding devolveu.
 * Pega a taxa da zona cadastrada geograficamente mais próxima em vez de
 * recusar o pedido — pedido explícito do dono do negócio pra endereços em
 * bairros/cidades ainda sem zona própria cadastrada. Ignora zonas sem
 * coordenada salva (ver scripts/geocode-delivery-zones.mjs).
 */
export function nearestDeliveryZone(lat: number, lng: number, zones: DeliveryZone[]): DeliveryZone | null {
  let best: DeliveryZone | null = null
  let bestDistanceKm = Infinity
  for (const zone of zones) {
    if (zone.lat == null || zone.lng == null) continue
    const distanceKm = haversineKm(lat, lng, zone.lat, zone.lng)
    if (distanceKm < bestDistanceKm) {
      bestDistanceKm = distanceKm
      best = zone
    }
  }
  return best
}
