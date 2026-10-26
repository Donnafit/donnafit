// O campo "Endereço (rua e número)" é um texto livre único — não existe campo
// separado pro número. Esta checagem só confere se o cliente escreveu ALGUM
// número de imóvel ali, sem impor formato: "Rua X, 123", "Rua X 123",
// "Rod. BR-277, km 12", "Quadra 3 Lote 5" e "123 Rua X" passam.
//
// Endereço sem número de verdade passa declarando isso por escrito ("S/N",
// "sem número"), igual se faz em qualquer formulário brasileiro.
//
// Número que faz parte do NOME da rua não conta como número do imóvel:
// "Rua 24 de Maio", "Av. 7 de Setembro", "Rua 1º de Maio", "Rua XV de
// Novembro" sem mais nada continuam pedindo o número. É exatamente o caso que
// o ViaCEP devolve ao autopreencher pelo CEP (só o nome da rua, sem número).
//
// Usada só pra orientar/travar o checkout no navegador. Não roda na API nem
// mexe em endereço já salvo (pedidos antigos e perfis ficam como estão).

const NO_NUMBER_DECLARED = /(^|[^a-z0-9])(s\s*\/\s*n[º°o]?|s\.\s*n\.?|sem\s+n[uú]mero|sem\s+n[º°o]?)(?![a-z0-9])/i

// Dígitos seguidos de "º"/"ª"/"°" ou de " de <palavra>" são data/ordinal do
// nome da rua ("24 de Maio", "1º de Maio"), não o número da casa.
const NUMBER_TOKEN = /\d+/g
const PART_OF_STREET_NAME = /^\s*[º°ª]|^\s*(de|do|da)\s+[a-zà-ú]/i

export function hasStreetNumber(street: string): boolean {
  const text = street.trim()
  if (!text) return false
  if (NO_NUMBER_DECLARED.test(text)) return true

  for (const match of text.matchAll(NUMBER_TOKEN)) {
    const after = text.slice((match.index ?? 0) + match[0].length)
    if (!PART_OF_STREET_NAME.test(after)) return true
  }
  return false
}
