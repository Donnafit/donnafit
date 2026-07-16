// Remove o complemento (apto, bloco, casa, sobrado etc.) do endereço digitado
// livremente pelo cliente — aplicado ANTES de matchDeliveryZone/geocodeToBairro
// pra que o complemento não polua nem o match por substring nem a query
// enviada ao Nominatim (endereços com complemento e sem o bairro escrito
// frequentemente retornavam resultado vazio do Nominatim antes desse fix).
const COMPLEMENT_KEYWORDS = [
  "apto", "ap", "apartamento", "bloco", "casa", "sobrado",
  "fundos", "cobertura", "sala",
]

export function stripAddressComplement(address: string): string {
  const trimmed = address.trim()
  if (!trimmed) return trimmed

  // 1. Hífen com espaços é o separador mais comum digitado pelo cliente
  //    (ex: "Rua Marechal Deodoro, 630 - Sala 12").
  const dashIndex = trimmed.indexOf(" - ")
  const beforeDash = dashIndex !== -1 ? trimmed.slice(0, dashIndex) : trimmed

  // 2. Palavra-chave de complemento aparecendo DEPOIS do primeiro número do
  //    endereço — só corta ali pra não arriscar cortar um nome de rua que por
  //    acaso contenha uma dessas palavras (ex: uma futura "Rua Casa Verde").
  const numberMatch = beforeDash.match(/\d+/)
  if (!numberMatch || numberMatch.index === undefined) return beforeDash.trim()

  const afterNumber = beforeDash.slice(numberMatch.index + numberMatch[0].length)
  const keywordRegex = new RegExp(`\\b(${COMPLEMENT_KEYWORDS.join("|")})\\b`, "i")
  const keywordMatch = afterNumber.match(keywordRegex)
  if (!keywordMatch || keywordMatch.index === undefined) return beforeDash.trim()

  const cutAt = numberMatch.index + numberMatch[0].length + keywordMatch.index
  return beforeDash.slice(0, cutAt).trim().replace(/[,]+$/, "").trim()
}
