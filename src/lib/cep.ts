export interface CepLookupResult {
  street: string
  bairro: string
  city: string
}

// ViaCEP: gratuito, sem chave, padrão de mercado pra autopreenchimento de
// endereço no Brasil. Falha (rede, CEP inexistente, timeout) nunca bloqueia
// o formulário — só significa que os campos seguem editáveis manualmente.
export async function lookupCep(cep: string): Promise<CepLookupResult | null> {
  const digits = cep.replace(/\D/g, "")
  if (digits.length !== 8) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.erro) return null
    return {
      street: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      city: data.localidade ?? "",
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
