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
// precisa confirmar o bairro uma vez; depois que salvar no formato novo
// (delivery_bairro presente), essa migração não roda mais pra esse cliente.
export function deliveryAddressFromUserMetadata(
  meta: Record<string, unknown> | undefined | null
): DeliveryAddressData {
  if (!meta) return emptyDeliveryAddress()

  const hasNewFormat = typeof meta.delivery_bairro === "string" && meta.delivery_bairro.length > 0
  if (hasNewFormat) {
    return {
      cep: typeof meta.delivery_cep === "string" ? meta.delivery_cep : "",
      street: typeof meta.delivery_street === "string" ? meta.delivery_street : "",
      bairro: meta.delivery_bairro as string,
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
