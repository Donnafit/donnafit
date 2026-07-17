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

  // Palavra-chave de complemento só é procurada DEPOIS do primeiro número do
  // endereço — pra não arriscar cortar um nome de rua que por acaso contenha
  // uma dessas palavras (ex: uma futura "Rua Casa Verde").
  const numberMatch = trimmed.match(/\d+/)
  if (!numberMatch || numberMatch.index === undefined) return trimmed

  const searchStart = numberMatch.index + numberMatch[0].length
  const head = trimmed.slice(0, searchStart)
  const tail = trimmed.slice(searchStart)

  // Remove só o trecho do complemento em si (separador + palavra-chave +
  // número opcional logo depois, ex: "- Sala 12" ou ", Apto 5"), preservando
  // o que vem antes E depois dele na mesma string — o bairro pode aparecer
  // tanto antes quanto depois do complemento, dependendo de como o cliente
  // digitou (cortar tudo depois do complemento, como a versão anterior
  // fazia, perdia o bairro sempre que ele vinha depois).
  const complementSegment = new RegExp(
    `[\\s,-]*\\b(${COMPLEMENT_KEYWORDS.join("|")})\\b\\.?\\s*\\d*`,
    "gi"
  )
  const cleanedTail = tail.replace(complementSegment, " ")

  return (head + cleanedTail)
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*,/g, ",")
    .trim()
    .replace(/^[,-]+\s*/, "")
    .replace(/\s*[,-]+$/, "")
}
