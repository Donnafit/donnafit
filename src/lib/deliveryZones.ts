export interface DeliveryZone {
  name: string
  fee: number
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
  const normalizedAddress = normalize(address)

  // "Atuba" existe em Curitiba (bairro) e em Colombo (localidade homônima) —
  // único caso de ambiguidade real na lista; desempata pela cidade citada.
  const hasColombo = normalizedAddress.includes("colombo")
  const hasAtuba = normalizedAddress.includes("atuba")
  if (hasAtuba && hasColombo) {
    const colomboZone = zones.find((z) => normalize(z.name) === normalize("Atuba (Colombo)"))
    if (colomboZone) return colomboZone
  }

  let best: DeliveryZone | null = null
  for (const zone of zones) {
    const normalizedName = normalize(zone.name).replace(/\s*\(colombo\)\s*/, "")
    if (normalizedName && normalizedAddress.includes(normalizedName)) {
      if (!best || normalizedName.length > normalize(best.name).length) {
        best = zone
      }
    }
  }
  return best
}
