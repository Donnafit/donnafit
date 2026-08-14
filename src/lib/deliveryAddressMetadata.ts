export interface DeliveryAddressData {
  cep: string
  street: string
  bairro: string
  bairroNotListed: boolean
  complement: string
}

export function emptyDeliveryAddress(): DeliveryAddressData {
  return { cep: "", street: "", bairro: "", bairroNotListed: false, complement: "" }
}

// user_metadata (Supabase Auth) no formato antigo só tinha `delivery_address`
// (string única, rua+bairro juntos, sem CEP/complemento/bairro estruturado).
// Migra pro novo shape sem perder o texto já digitado pelo cliente — ele só
// precisa confirmar o bairro uma vez; depois que salvar no formato novo,
// essa migração não roda mais pra esse cliente.
//
// O gate do formato novo é `delivery_street`, NÃO `delivery_bairro`: o modal de
// perfil (diferente do checkout) não exige o bairro, e salva
// delivery_street/delivery_bairro/... sempre juntos — com bairro "" quando o
// cliente não mexeu no select. Se o gate fosse o bairro, esse save gravaria
// delivery_street novo mas continuaria caindo no legado `delivery_address`
// (que nada apaga), e a edição de rua do cliente ficaria perdida pra sempre.
// Com o gate na rua, qualquer save pelo formulário novo passa a mandar nos
// campos estruturados — bairro pode vir vazio, e aí a UI pede pra escolher.
export function deliveryAddressFromUserMetadata(
  meta: Record<string, unknown> | undefined | null
): DeliveryAddressData {
  if (!meta) return emptyDeliveryAddress()

  // Presença do campo (mesmo string vazia) já marca "salvou pelo formulário
  // novo" — `deliveryAddressToUserMetadataPatch` sempre grava delivery_street.
  const newStreet = meta.delivery_street
  if (typeof newStreet === "string") {
    return {
      cep: typeof meta.delivery_cep === "string" ? meta.delivery_cep : "",
      street: newStreet,
      bairro: typeof meta.delivery_bairro === "string" ? meta.delivery_bairro : "",
      bairroNotListed: false,
      complement: typeof meta.delivery_complement === "string" ? meta.delivery_complement : "",
    }
  }

  const legacyAddress = typeof meta.delivery_address === "string" ? meta.delivery_address : ""
  return { cep: "", street: legacyAddress, bairro: "", bairroNotListed: false, complement: "" }
}

export function deliveryAddressToUserMetadataPatch(
  value: DeliveryAddressData
): Record<string, unknown> {
  return {
    delivery_cep: value.cep.trim() || undefined,
    delivery_street: value.street.trim(),
    delivery_bairro: value.bairro.trim(),
    delivery_complement: value.complement.trim() || undefined,
  }
}
