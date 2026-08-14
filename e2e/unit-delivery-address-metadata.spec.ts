import { test, expect } from "@playwright/test"
import {
  deliveryAddressFromUserMetadata,
  deliveryAddressToUserMetadataPatch,
  emptyDeliveryAddress,
} from "../src/lib/deliveryAddressMetadata"

test.describe("deliveryAddressFromUserMetadata", () => {
  test("metadata vazio devolve endereço vazio", () => {
    expect(deliveryAddressFromUserMetadata(null)).toEqual(emptyDeliveryAddress())
    expect(deliveryAddressFromUserMetadata(undefined)).toEqual(emptyDeliveryAddress())
  })

  test("formato legado (delivery_address string única) migra pro campo street, bairro fica vazio", () => {
    const result = deliveryAddressFromUserMetadata({ delivery_address: "Rua X, 123, Batel" })
    expect(result.street).toBe("Rua X, 123, Batel")
    expect(result.bairro).toBe("")
    expect(result.cep).toBe("")
  })

  test("salvou pelo perfil sem escolher bairro: lê o formato novo, nunca volta pro delivery_address velho", () => {
    // Cenário real: cliente legado abre o perfil, corrige só a rua e salva sem
    // tocar no select de bairro (o perfil não exige bairro). O patch grava
    // delivery_street novo e delivery_bairro "". Se o gate do formato novo
    // fosse o bairro, a leitura cairia no delivery_address antigo (que nada
    // apaga) e a correção do cliente sumiria pra sempre.
    const result = deliveryAddressFromUserMetadata({
      delivery_address: "Rua X, 123, Batel",
      delivery_street: "Rua Y, 500",
      delivery_bairro: "",
    })
    expect(result.street).toBe("Rua Y, 500")
    expect(result.bairro).toBe("")

    // Mesmo caso, com delivery_bairro ausente em vez de vazio.
    const semBairro = deliveryAddressFromUserMetadata({
      delivery_address: "Rua X, 123, Batel",
      delivery_street: "Rua Y, 500",
    })
    expect(semBairro.street).toBe("Rua Y, 500")
    expect(semBairro.bairro).toBe("")
  })

  test("formato novo (delivery_bairro presente) lê os 4 campos estruturados", () => {
    const result = deliveryAddressFromUserMetadata({
      delivery_cep: "80010-000",
      delivery_street: "Rua XV de Novembro, 100",
      delivery_bairro: "Centro",
      delivery_complement: "Apto 12",
    })
    expect(result).toEqual({
      cep: "80010-000",
      street: "Rua XV de Novembro, 100",
      bairro: "Centro",
      bairroNotListed: false,
      complement: "Apto 12",
    })
  })
})

test.describe("deliveryAddressToUserMetadataPatch", () => {
  test("monta o patch com os 4 campos, undefined para opcionais vazios", () => {
    const patch = deliveryAddressToUserMetadataPatch({
      cep: "",
      street: "Rua X, 100",
      bairro: "Batel",
      bairroNotListed: false,
      complement: "",
    })
    expect(patch).toEqual({
      delivery_cep: undefined,
      delivery_street: "Rua X, 100",
      delivery_bairro: "Batel",
      delivery_complement: undefined,
    })
  })
})
