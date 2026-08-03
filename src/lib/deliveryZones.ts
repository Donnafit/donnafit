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
    .replace(/\./g, "") // "Av." / "R." — não deixa o ponto quebrar o match do prefixo de rua
    .toLowerCase()
}

// Prefixos de logradouro — usados só pra detectar quando o endereço abre com
// um NOME DE RUA (ver restrictToPostStreetNameText abaixo), nunca pra
// remover nada do endereço.
const STREET_PREFIXES = [
  "rua", "r", "av", "avenida", "alameda", "al", "travessa", "trav",
  "rodovia", "rod", "estrada", "servidao", "viela", "praca", "largo",
]

/**
 * Quando o endereço abre com um prefixo de logradouro (rua, av...), restringe
 * a busca por bairro ao trecho A PARTIR do primeiro número/vírgula/hífen —
 * evita que um nome de bairro cadastrado que apareça por acaso dentro do
 * NOME DA RUA (ex: "Rua São Francisco de Sales" ⊃ "São Francisco", "Rua Alto
 * Boqueirão" ⊃ "Boqueirão") seja tratado como o bairro do endereço. Bairro
 * digitado depois do número — com ou sem vírgula antes dele — continua
 * batendo normalmente, já que só o TRECHO DO NOME DA RUA é descartado, não o
 * endereço inteiro.
 */
function restrictToPostStreetNameText(normalizedAddress: string): string {
  const boundary = normalizedAddress.match(/[\d,-]/)
  if (!boundary || boundary.index === undefined) return normalizedAddress
  const leadingClause = normalizedAddress.slice(0, boundary.index).trim()
  const firstWord = leadingClause.split(/\s+/)[0] ?? ""
  if (!STREET_PREFIXES.includes(firstWord)) return normalizedAddress
  return normalizedAddress.slice(boundary.index)
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

  // "Rua São Francisco de Sales" fica em cima da divisa entre Xaxim e Alto
  // Boqueirão — o nome da rua sozinho já batia por substring com o bairro
  // cadastrado "São Francisco" (taxa R$10), cobrando errado um endereço que
  // é Xaxim (taxa R$16) na prática de entrega real. Mesmo com o guard de
  // restrictToPostStreetNameText abaixo (que já evita o match errado com
  // "São Francisco"), o geocoding externo (Nominatim) também erra pra "Alto
  // Boqueirão" nessa rua — por isso o caso especial, no mesmo padrão do
  // Atuba/Colombo acima. Bug relatado 03/08/2026.
  if (normalizedAddress.includes("sao francisco de sales")) {
    const xaximZone = zones.find((z) => normalize(z.name) === normalize("Xaxim"))
    if (xaximZone) return xaximZone
  }

  // Não removemos o sufixo "(Colombo)" do nome aqui: como ninguém digita
  // literalmente "(Colombo)" com parênteses no endereço, "Atuba (Colombo)"
  // nunca bate por substring neste loop genérico — só pelo caso especial
  // acima. Removê-lo (como uma versão anterior fazia) igualava o nome
  // normalizado de "Atuba (Colombo)" ao de "Atuba", fazendo a escolha
  // depender da ordem de iteração e, sem "Colombo" no endereço, às vezes
  // escolher a zona errada (Colombo em vez de Curitiba).
  const searchableAddress = restrictToPostStreetNameText(normalizedAddress)
  let best: DeliveryZone | null = null
  let bestNormalizedLength = -1
  for (const zone of zones) {
    const normalizedName = normalize(zone.name)
    if (normalizedName && searchableAddress.includes(normalizedName) && normalizedName.length > bestNormalizedLength) {
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
