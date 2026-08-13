import { normalize } from "./deliveryZones"

// Cidades fora da área de entrega — bloqueadas explicitamente, mesmo que o
// fallback de "zona cadastrada mais próxima" (nearestDeliveryZone) consiga
// calcular uma taxa pra elas. Ver spec 2026-08-13-endereco-cep-bairro-design.md.
export const BLOCKED_CITIES = ["Campo Largo", "Araucária", "Fazenda Rio Grande"] as const

export const BLOCKED_CITY_MESSAGE =
  "Ainda não entregamos em sua região, mas estamos trabalhando para, em breve, conseguir atender vocês também! 💚"

// Match por palavra/frase inteira, normalizado (sem acento, minúsculo) — não
// por substring solto. Sem o boundary check, "Araucárias" (rua/bairro comum,
// plural) bateria com a cidade "Araucária" (singular) por engano, igual ao
// bug de rua homônima que este trabalho está corrigindo em outro lugar.
export function isBlockedCity(text: string): boolean {
  const normalizedText = normalize(text)
  return BLOCKED_CITIES.some((city) => {
    const normalizedCity = normalize(city)
    const pattern = new RegExp(`(^|[^a-z])${normalizedCity}([^a-z]|$)`)
    return pattern.test(normalizedText)
  })
}
