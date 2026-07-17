import { stripAddressComplement } from "./addressComplement"

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
