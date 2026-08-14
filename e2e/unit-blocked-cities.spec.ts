import { test, expect } from "@playwright/test"
import { isBlockedCity, BLOCKED_CITY_MESSAGE, BLOCKED_CITIES } from "../src/lib/blockedCities"

test.describe("isBlockedCity", () => {
  test("detecta as 3 cidades bloqueadas, com e sem acento/caixa", () => {
    expect(isBlockedCity("Campo Largo")).toBe(true)
    expect(isBlockedCity("araucaria")).toBe(true)
    expect(isBlockedCity("ARAUCÁRIA")).toBe(true)
    expect(isBlockedCity("Fazenda Rio Grande")).toBe(true)
  })

  test("detecta dentro de um endereço completo", () => {
    expect(isBlockedCity("Rua das Flores, 123 - Centro, Campo Largo, PR")).toBe(true)
  })

  test("não bloqueia bairros/ruas que só contêm um prefixo parecido", () => {
    expect(isBlockedCity("Bigorrilho")).toBe(false)
    // "Araucárias" (plural, nome comum de rua/bairro com árvore) não pode
    // disparar o bloqueio da cidade "Araucária" (singular) por substring solto.
    expect(isBlockedCity("Rua das Araucárias, 50, Batel, Curitiba")).toBe(false)
  })

  test("mensagem de bloqueio é a definida na spec", () => {
    expect(BLOCKED_CITY_MESSAGE).toBe(
      "Ainda não entregamos em sua região, mas estamos trabalhando para, em breve, conseguir atender vocês também! 💚"
    )
    expect(BLOCKED_CITIES).toEqual(["Campo Largo", "Araucária", "Fazenda Rio Grande"])
  })
})
