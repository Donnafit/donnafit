import { test, expect } from "@playwright/test"
import { lookupCep } from "../src/lib/cep"

test.describe("lookupCep", () => {
  test("devolve rua/bairro/cidade em CEP válido", async () => {
    const originalFetch = global.fetch
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          cep: "80010-000",
          logradouro: "Rua XV de Novembro",
          bairro: "Centro",
          localidade: "Curitiba",
          uf: "PR",
        }),
        { status: 200 }
      )) as typeof fetch
    try {
      const result = await lookupCep("80010-000")
      expect(result).toEqual({ street: "Rua XV de Novembro", bairro: "Centro", city: "Curitiba" })
    } finally {
      global.fetch = originalFetch
    }
  })

  test("devolve null para CEP inexistente (resposta erro: true)", async () => {
    const originalFetch = global.fetch
    global.fetch = (async () => new Response(JSON.stringify({ erro: true }), { status: 200 })) as typeof fetch
    try {
      expect(await lookupCep("00000000")).toBeNull()
    } finally {
      global.fetch = originalFetch
    }
  })

  test("devolve null para CEP com formato inválido, sem chamar rede", async () => {
    let called = false
    const originalFetch = global.fetch
    global.fetch = (async () => {
      called = true
      return new Response("{}", { status: 200 })
    }) as typeof fetch
    try {
      expect(await lookupCep("123")).toBeNull()
      expect(called).toBe(false)
    } finally {
      global.fetch = originalFetch
    }
  })

  test("devolve null se a rede falhar", async () => {
    const originalFetch = global.fetch
    global.fetch = (async () => {
      throw new Error("network down")
    }) as typeof fetch
    try {
      expect(await lookupCep("80010000")).toBeNull()
    } finally {
      global.fetch = originalFetch
    }
  })
})
