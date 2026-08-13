# Endereço estruturado (CEP/bairro/complemento) e bloqueio de cidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os campos soltos de "Endereço"/"Complemento" no checkout e no
modal de perfil por um conjunto estruturado (CEP → autopreenchimento, Endereço,
**Bairro selecionado de uma lista fechada**, Complemento), persistido para
clientes logados, com bloqueio explícito de venda para Campo Largo, Araucária
e Fazenda Rio Grande.

**Architecture:** Um componente React compartilhado (`AddressFields`) encapsula
os 4 campos e a lógica de CEP/bairro/bloqueio; é consumido tanto pelo checkout
quanto pelo modal de perfil. O bairro escolhido pelo cliente vira a fonte de
verdade do frete no servidor (em vez do texto livre do endereço), com o
pipeline de matching por texto/geocoding existente rebaixado a motor de
sugestão e rede de segurança. Bloqueio de cidade é checado em 3 camadas
(client no CEP, client no fallback manual, servidor) — nenhuma delas sozinha
é a fonte de verdade final, mas juntas cobrem o caminho normal e o caminho de
tentativa de manipulação de payload.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + Auth),
ViaCEP (lookup de CEP gratuito, sem chave), Playwright (único test runner do
projeto — não há Jest/Vitest).

**Spec:** `docs/superpowers/specs/2026-08-13-endereco-cep-bairro-design.md`

## Global Constraints

- Mensagem de bloqueio, EXATA (não parafrasear): `Ainda não entregamos em sua
  região, mas estamos trabalhando para, em breve, conseguir atender vocês
  também! 💚`
- Cidades bloqueadas, EXATAS: `Campo Largo`, `Araucária`, `Fazenda Rio Grande`.
- Provedor de CEP: ViaCEP, `https://viacep.com.br/ws/{cep}/json/`, sem chave,
  timeout de 3s, falha sempre silenciosa (nunca bloqueia o formulário).
- `MIN_DELIVERY_ITEMS = 8` (`src/hooks/useCart.ts`) — pedidos de teste com
  `deliveryType: "delivery"` nos testes E2E precisam de `quantity >= 8`.
- **Não existe Jest/Vitest neste projeto** — só Playwright (`e2e/*.spec.ts`,
  `npx playwright test <arquivo> --project=chromium`, precisa de `npm run dev`
  rodando antes, `baseURL` local `http://localhost:3001`). Funções puras
  (sem DOM/browser) também são testadas com Playwright — `test()`/`expect()`
  funcionam em Node puro, sem precisar da fixture `page`. Não introduzir uma
  lib de teste nova.
- Persistência de endereço é **só para cliente logado** (`user_metadata` via
  Supabase Auth) — decisão explícita do usuário, convidado continua sem
  persistência entre sessões.
- Servidor nunca confia em valor de preço/zona vindo só do client — mesmo
  padrão de integridade já usado para preço de produto/estoque em
  `/api/orders/route.ts`.

---

## Mapa de arquivos

**Criar:**
- `src/lib/blockedCities.ts` — lista de cidades bloqueadas + `isBlockedCity()`.
- `src/lib/cep.ts` — `lookupCep()` (ViaCEP).
- `src/lib/deliveryAddressMetadata.ts` — tipo `DeliveryAddressData` + migração
  do formato legado de `user_metadata` + montagem do patch de salvamento.
- `src/components/checkout/AddressFields.tsx` — os 4 campos, reusado no
  checkout e no perfil.
- `e2e/unit-blocked-cities.spec.ts`, `e2e/unit-cep.spec.ts`,
  `e2e/unit-delivery-address-metadata.spec.ts` — testes de função pura via
  Playwright (sem browser).
- `e2e/api-orders-blocked-city.spec.ts` — testes de API para bloqueio de
  cidade e confiança no `deliveryBairro` explícito.

**Modificar:**
- `src/lib/deliveryZones.ts` — exportar `normalize` (era privada), sem outra
  mudança de comportamento.
- `src/app/api/orders/route.ts` — aceitar `deliveryBairro`/`deliveryCityCheck`
  no body, checar cidade bloqueada, confiar no bairro explícito antes do
  pipeline de texto.
- `src/components/checkout/CheckoutForm.tsx` — trocar os campos soltos de
  endereço/complemento pelo `<AddressFields>`, remover o pipeline de geocoding
  que migra pro componente, persistir endereço estruturado no
  `user_metadata` do cliente logado, mandar `deliveryBairro`/
  `deliveryCityCheck` no payload do pedido.
- `src/components/ui/ProfileModal.tsx` — trocar o campo único de endereço
  pelo `<AddressFields>`, buscar zonas ativas, salvar no formato novo.

---

### Task 1: `isBlockedCity` e export de `normalize`

**Files:**
- Modify: `src/lib/deliveryZones.ts:10` (`function normalize` → `export function normalize`)
- Create: `src/lib/blockedCities.ts`
- Test: `e2e/unit-blocked-cities.spec.ts`

**Interfaces:**
- Produces: `normalize(value: string): string` (exportado, já existia); `BLOCKED_CITIES: readonly string[]`, `BLOCKED_CITY_MESSAGE: string`, `isBlockedCity(text: string): boolean` de `src/lib/blockedCities.ts`.

- [ ] **Step 1: Exportar `normalize`**

Em `src/lib/deliveryZones.ts:10`, mudar:
```ts
function normalize(value: string): string {
```
para:
```ts
export function normalize(value: string): string {
```
Nenhuma outra linha do arquivo muda.

- [ ] **Step 2: Escrever o teste (falha por enquanto — `blockedCities.ts` não existe)**

Criar `e2e/unit-blocked-cities.spec.ts`:
```ts
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
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npx playwright test e2e/unit-blocked-cities.spec.ts --project=chromium`
Expected: FAIL — `Cannot find module '../src/lib/blockedCities'`.

- [ ] **Step 4: Implementar `src/lib/blockedCities.ts`**

```ts
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
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx playwright test e2e/unit-blocked-cities.spec.ts --project=chromium`
Expected: PASS (4/4).

- [ ] **Step 6: Commit**

```bash
git add src/lib/deliveryZones.ts src/lib/blockedCities.ts e2e/unit-blocked-cities.spec.ts
git commit -m "feat(frete): bloqueia venda para Campo Largo, Araucária e Fazenda Rio Grande

isBlockedCity() com match por palavra/frase inteira (normalizado), não
substring solto — evita falso positivo tipo 'Araucárias' (rua/bairro comum)
batendo com a cidade 'Araucária'.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `lookupCep` (ViaCEP)

**Files:**
- Create: `src/lib/cep.ts`
- Test: `e2e/unit-cep.spec.ts`

**Interfaces:**
- Produces: `interface CepLookupResult { street: string; bairro: string; city: string }`; `lookupCep(cep: string): Promise<CepLookupResult | null>` de `src/lib/cep.ts`.

- [ ] **Step 1: Escrever o teste (falha — `cep.ts` não existe)**

Criar `e2e/unit-cep.spec.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test e2e/unit-cep.spec.ts --project=chromium`
Expected: FAIL — `Cannot find module '../src/lib/cep'`.

- [ ] **Step 3: Implementar `src/lib/cep.ts`**

```ts
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
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx playwright test e2e/unit-cep.spec.ts --project=chromium`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cep.ts e2e/unit-cep.spec.ts
git commit -m "feat(endereco): lookupCep() via ViaCEP pra autopreencher rua/bairro/cidade

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `DeliveryAddressData` e migração de `user_metadata`

**Files:**
- Create: `src/lib/deliveryAddressMetadata.ts`
- Test: `e2e/unit-delivery-address-metadata.spec.ts`

**Interfaces:**
- Consumes: nenhuma (função pura sobre um objeto genérico).
- Produces: `interface DeliveryAddressData { cep: string; street: string; bairro: string; bairroNotListed: boolean; complement: string }`; `emptyDeliveryAddress(): DeliveryAddressData`; `deliveryAddressFromUserMetadata(meta): DeliveryAddressData`; `deliveryAddressToUserMetadataPatch(value): Record<string, unknown>` de `src/lib/deliveryAddressMetadata.ts`.

- [ ] **Step 1: Escrever o teste (falha — arquivo não existe)**

Criar `e2e/unit-delivery-address-metadata.spec.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test e2e/unit-delivery-address-metadata.spec.ts --project=chromium`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/lib/deliveryAddressMetadata.ts`**

```ts
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
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx playwright test e2e/unit-delivery-address-metadata.spec.ts --project=chromium`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deliveryAddressMetadata.ts e2e/unit-delivery-address-metadata.spec.ts
git commit -m "feat(endereco): tipo DeliveryAddressData e migração do user_metadata legado

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Servidor — `deliveryBairro` explícito e bloqueio de cidade em `/api/orders`

**Files:**
- Modify: `src/app/api/orders/route.ts:12-24` (interface `OrderBody`), `:178-215` (resolução de zona)
- Test: `e2e/api-orders-blocked-city.spec.ts`

**Interfaces:**
- Consumes: `isBlockedCity`, `BLOCKED_CITY_MESSAGE` de `src/lib/blockedCities.ts` (Task 1).
- Produces: `/api/orders` aceita `deliveryBairro?: string` e `deliveryCityCheck?: string` no body; responde 400 com `BLOCKED_CITY_MESSAGE` quando a cidade está bloqueada; usa `deliveryBairro` direto contra `delivery_zones` ativa antes de rodar `matchDeliveryZone`/geocoding.

- [ ] **Step 1: Escrever os testes de API (falham — comportamento novo ainda não existe)**

Criar `e2e/api-orders-blocked-city.spec.ts`:
```ts
import { test, expect } from "@playwright/test"
import { loadFixtures, resetProductStock } from "./fixtures"

const fx = loadFixtures()

test.beforeAll(async () => {
  await resetProductStock(fx.product.id, 100)
})

function deliveryItem() {
  return {
    product: {
      id: fx.product.id,
      name: fx.product.name,
      sku: `E2E-TEST-${fx.runTag}`,
      price: fx.product.price,
      stock_type: "avulso",
      category_id: null,
    },
    quantity: 8, // MIN_DELIVERY_ITEMS
  }
}

test.describe("/api/orders — bloqueio de cidade e bairro explícito", () => {
  test("recusa pedido com deliveryCityCheck = Campo Largo", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990010",
        deliveryType: "delivery",
        address: "Rua das Palmeiras, 100",
        deliveryAddress: "Rua das Palmeiras, 100",
        deliveryCityCheck: "Campo Largo",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Ainda não entregamos em sua região")
  })

  test("recusa pedido quando o próprio endereço contém o nome da cidade bloqueada, mesmo sem deliveryCityCheck", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990011",
        deliveryType: "delivery",
        address: "Rua Principal, 50, Araucária",
        deliveryAddress: "Rua Principal, 50, Araucária",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Ainda não entregamos em sua região")
  })

  test("aceita deliveryBairro explícito e usa a taxa da zona, sem depender do texto do endereço", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990012",
        deliveryType: "delivery",
        address: "Endereço sem nome de bairro reconhecível, 999",
        deliveryAddress: "Endereço sem nome de bairro reconhecível, 999",
        deliveryBairro: "Centro",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.deliveryFee).toBeGreaterThan(0)
  })

  test("deliveryBairro de zona inativa/inexistente cai no pipeline de texto de hoje, não rejeita o pedido", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: `[E2E_TEST] Cliente ${fx.runTag}`,
        customerPhone: "41999990013",
        deliveryType: "delivery",
        address: "Rua XV de Novembro, 100, Centro",
        deliveryAddress: "Rua XV de Novembro, 100, Centro",
        deliveryBairro: "Bairro Que Não Existe",
        paymentMethod: "pix",
        items: [deliveryItem()],
        total: fx.product.price * 8,
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.deliveryFee).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falham (pelo menos os 3 primeiros — o 4º já passa hoje por acaso)**

Run: `npm run dev` (outro terminal, porta 3001) e depois:
```bash
npx playwright test e2e/api-orders-blocked-city.spec.ts --project=chromium
```
Expected: os testes de bloqueio devolvem 200 (deveriam ser 400) e o teste de `deliveryBairro` explícito ignora o campo (mesmo resultado do pipeline de texto, mas não é o que estamos validando) — FAIL nos 3 primeiros.

- [ ] **Step 3: Implementar as mudanças em `src/app/api/orders/route.ts`**

Adicionar import no topo (perto dos outros imports de `@/lib`):
```ts
import { isBlockedCity, BLOCKED_CITY_MESSAGE } from "@/lib/blockedCities"
```

Atualizar a interface `OrderBody` (linhas 12-24), adicionando os dois campos novos:
```ts
interface OrderBody {
  customerName: string
  customerPhone: string
  deliveryType: "delivery" | "pickup"
  paymentMethod: "pix" | "card" | "card_link"
  address?: string
  deliveryAddress?: string
  deliveryFee?: number
  deliveryBairro?: string
  deliveryCityCheck?: string
  items: CartItem[]
  subtotal?: number
  total: number
  riceChoices?: Record<string, "integral" | "branco">
}
```

Substituir o bloco de resolução de zona (linhas 194-215) por:
```ts
  let deliveryFee = 0
  if (body.deliveryType === "delivery") {
    const addressForZoneMatch = body.address?.trim() || body.deliveryAddress!

    // Defesa em profundidade: o client (AddressFields) já deveria ter
    // bloqueado esse pedido antes de chegar aqui (CEP resolvido ou fallback
    // manual de bairro). Reconfirma usando tanto o valor que o client mandou
    // explicitamente quanto o próprio texto do endereço — nunca confia só
    // no que o client decidiu, mesmo padrão de integridade já usado para
    // preço/estoque de produto neste arquivo.
    const cityCandidates = [body.deliveryCityCheck, addressForZoneMatch].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    )
    if (cityCandidates.some((candidate) => isBlockedCity(candidate))) {
      return NextResponse.json({ error: BLOCKED_CITY_MESSAGE }, { status: 400 })
    }

    const { data: activeZones } = await supabase
      .from("delivery_zones")
      .select("name, fee, lat, lng")
      .eq("active", true)
      .order("name")

    // Bairro já resolvido explicitamente no client (seleção na lista ou
    // fallback de zona mais próxima já calculado em tela) — usado direto se
    // bater com uma zona ativa, sem rodar o pipeline de texto de novo.
    let zone = body.deliveryBairro
      ? (activeZones ?? []).find((z: { name: string }) => z.name === body.deliveryBairro) ?? null
      : null
    if (!zone) zone = matchDeliveryZone(addressForZoneMatch, activeZones ?? [])
    if (!zone) {
      // Endereço sem o nome do bairro escrito — tenta resolver via geocoding
      // (mesmo fallback usado no checkout) antes de recusar o pedido.
      const geocoded = await geocodeAddress(addressForZoneMatch)
      if (geocoded?.bairro) zone = matchDeliveryZone(geocoded.bairro, activeZones ?? [])
      // Bairro/cidade real mas ainda sem zona própria cadastrada — usa a
      // taxa da zona cadastrada mais próxima em vez de recusar o pedido.
      if (!zone && geocoded) zone = nearestDeliveryZone(geocoded.lat, geocoded.lng, activeZones ?? [])
    }
    if (!zone) {
      return NextResponse.json({ error: "Não foi possível identificar o bairro no endereço informado" }, { status: 400 })
    }
    deliveryFee = Number(zone.fee)
  }
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npx playwright test e2e/api-orders-blocked-city.spec.ts --project=chromium`
Expected: PASS (4/4).

- [ ] **Step 5: Rodar a suíte de frete existente pra garantir que nada quebrou**

Run: `npx playwright test e2e/checkout-delivery-fee.spec.ts e2e/api-orders-integrity.spec.ts --project=chromium`
Expected: PASS (comportamento antigo sem `deliveryBairro` continua idêntico).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/orders/route.ts e2e/api-orders-blocked-city.spec.ts
git commit -m "feat(frete): /api/orders aceita bairro explícito e bloqueia cidade não atendida

deliveryBairro do client é usado direto contra delivery_zones ativa antes
do pipeline de matching por texto (que continua existindo como fallback).
Bloqueio de cidade (Campo Largo/Araucária/Fazenda Rio Grande) checado no
servidor como defesa em profundidade, mesmo que o client já devesse ter
barrado antes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: `AddressFields` + integração no checkout

**Files:**
- Create: `src/components/checkout/AddressFields.tsx`
- Create: `e2e/helpers.ts` (extrai `login`/`addToCartAndGoToCheckout`, hoje duplicados só em `checkout-delivery-fee.spec.ts`, pra reusar nos novos testes)
- Modify: `src/components/checkout/CheckoutForm.tsx` (estados de endereço, `useEffect` de autopreenchimento/geocoding, JSX dos campos, payload de `/api/orders`, salvamento pós-pedido em `user_metadata`, `isFormValid`)
- Modify: `e2e/checkout-delivery-fee.spec.ts` (o describe "sem seleção manual de bairro" afirma hoje que **não existe select de bairro** — vira falso por design com este plano; reescrever pra refletir o fluxo novo)
- Test: `e2e/checkout-address-fields.spec.ts`

**Interfaces:**
- Consumes: `DeliveryZone`, `matchDeliveryZone`, `normalize` de `src/lib/deliveryZones.ts`; `isBlockedCity`, `BLOCKED_CITY_MESSAGE` de `src/lib/blockedCities.ts`; `lookupCep` de `src/lib/cep.ts`; `DeliveryAddressData`, `emptyDeliveryAddress`, `deliveryAddressFromUserMetadata`, `deliveryAddressToUserMetadataPatch` de `src/lib/deliveryAddressMetadata.ts`.
- Produces: componente `AddressFields` com props `{ zones: DeliveryZone[]; value: DeliveryAddressData; onChange: (v: DeliveryAddressData) => void; onZoneResolved: (r: { zone: DeliveryZone | null; approximate: boolean }) => void; onBlockedChange: (blocked: boolean, cityText?: string) => void; showFeeHint?: boolean }`, export default de `src/components/checkout/AddressFields.tsx` — consumido também pela Task 6 (`ProfileModal.tsx`).

- [ ] **Step 1: Extrair `login`/`addToCartAndGoToCheckout` pra `e2e/helpers.ts`**

Hoje esse fluxo (login do cliente de fixture, adicionar 8 unidades do produto
ao carrinho, ir pro checkout, preencher nome/telefone, clicar em "Entrega")
só existe duplicado dentro de `e2e/checkout-delivery-fee.spec.ts:22-52`. Os
testes novos deste plano (checkout e perfil) precisam do mesmo fluxo —
extrair antes de duplicar de novo.

Criar `e2e/helpers.ts` com o conteúdo exato hoje em
`checkout-delivery-fee.spec.ts:22-52` (copiar, não reescrever):
```ts
import { expect, type Page } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

export async function login(page: Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Perfil" }).click()
  await page.getByPlaceholder("seu@email.com").fill(fx.customer.email)
  await page.getByPlaceholder("••••••••").fill(fx.customer.password)
  await page.locator("form").getByRole("button", { name: "Entrar" }).click()
  await page.waitForTimeout(500)
}

export async function addToCartAndGoToCheckout(page: Page) {
  await login(page)
  await page.goto(`/produto/${fx.product.id}`)
  await page.getByRole("button", { name: /adicionar ao carrinho/i }).click()
  // Frete mínimo de 8 marmitas (B14) — sem isso, o botão "Entrega" abaixo
  // fica desabilitado e os testes que usam este helper quebram.
  // Locator escopado a <main>: o CartDrawer (montado globalmente pelo Header,
  // fora de <main>, off-screen quando fechado) renderiza um botão com o MESMO
  // aria-label "Adicionar mais um" assim que o item entra no carrinho —
  // sem escopo, o locator fica ambíguo (2 matches) e o clique trava até
  // o timeout tentando interagir com o botão fora da viewport do drawer.
  for (let i = 1; i < 8; i++) {
    await page.locator("main").getByRole("button", { name: "Adicionar mais um" }).click()
  }
  await page.getByRole("button", { name: "Carrinho" }).first().click()
  await expect(page.getByTestId("cart-drawer").getByRole("button", { name: "Remover um" })).toBeVisible({ timeout: 5000 })
  await page.getByRole("link", { name: /finalizar pedido/i }).or(page.getByRole("button", { name: /finalizar pedido/i })).click()
  await expect(page).toHaveURL(/\/checkout/, { timeout: 10_000 })
  await page.getByPlaceholder("Seu nome e sobrenome").fill("Cliente Frete E2E")
  await page.getByPlaceholder("(41) 99999-9999").fill("41999997777")
  await page.getByRole("button", { name: /^Entrega/ }).click()
}
```

Em `e2e/checkout-delivery-fee.spec.ts`, remover as definições locais de
`login`/`addToCartAndGoToCheckout` (linhas 22-52) e os imports que só
serviam a elas (`createClient`, `fs` — checar se `adminClient()`, usado mais
abaixo no arquivo, também depende deles; se sim, manter `createClient`/`fs`
só pra `adminClient()`), substituindo por:
```ts
import { login, addToCartAndGoToCheckout } from "./helpers"
```

- [ ] **Step 2: Escrever o teste E2E do fluxo novo (falha — componente/integração não existem)**

Criar `e2e/checkout-address-fields.spec.ts`:
```ts
import { test, expect } from "@playwright/test"
import { loadFixtures, resetProductStock } from "./fixtures"
import { addToCartAndGoToCheckout } from "./helpers"

const fx = loadFixtures()

test.beforeAll(async () => {
  await resetProductStock(fx.product.id, 100)
})

test.describe("Checkout — campos de endereço estruturado", () => {
  test("CEP autopreenche endereço e pré-seleciona o bairro quando existe zona cadastrada", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("00000-000").fill("80010-000") // Rua José Loureiro, Centro, Curitiba
    await expect(page.getByLabel("Bairro")).toHaveValue("Centro", { timeout: 8000 })
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible()
  })

  test("bairro fora da lista usa o fallback de zona mais próxima com aviso de estimativa", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Euclides da Cunha, 1235")
    await page.getByLabel("Bairro").selectOption({ label: "Meu bairro não está na lista" })
    await page.getByPlaceholder("Digite o nome do seu bairro").fill("Vargem Grande, Pinhais")
    await expect(page.getByText(/frete estimado pela zona mais próxima/i)).toBeVisible({ timeout: 8000 })
  })

  test("CEP de cidade bloqueada mostra a mensagem e desabilita o pedido", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("00000-000").fill("83601-000") // Rua Centenário, Centro, Campo Largo/PR
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole("button", { name: /confirmar e abrir whatsapp/i })).toBeDisabled()
  })

  test("bairro digitado manualmente contendo cidade bloqueada também recusa", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder("Rua, número").fill("Rua Principal, 50")
    await page.getByLabel("Bairro").selectOption({ label: "Meu bairro não está na lista" })
    await page.getByPlaceholder("Digite o nome do seu bairro").fill("Centro, Araucária")
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })
  })
})
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npx playwright test e2e/checkout-address-fields.spec.ts --project=chromium`
Expected: FAIL — os placeholders/labels novos ainda não existem na tela.

- [ ] **Step 4: Implementar `src/components/checkout/AddressFields.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { matchDeliveryZone, normalize, type DeliveryZone } from "@/lib/deliveryZones"
import { isBlockedCity, BLOCKED_CITY_MESSAGE } from "@/lib/blockedCities"
import { lookupCep } from "@/lib/cep"
import type { DeliveryAddressData } from "@/lib/deliveryAddressMetadata"

export interface ResolvedZone {
  zone: DeliveryZone | null
  approximate: boolean
}

export interface AddressFieldsProps {
  zones: DeliveryZone[]
  value: DeliveryAddressData
  onChange: (value: DeliveryAddressData) => void
  onZoneResolved: (resolved: ResolvedZone) => void
  onBlockedChange: (blocked: boolean, cityText?: string) => void
  // false no modal de perfil (não há carrinho/frete pra mostrar ali, só o
  // cadastro do endereço padrão) — true no checkout.
  showFeeHint?: boolean
}

const NOT_LISTED_OPTION = "__not_listed__"

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontWeight: 700,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 8,
}

export default function AddressFields({
  zones,
  value,
  onChange,
  onZoneResolved,
  onBlockedChange,
  showFeeHint = true,
}: AddressFieldsProps) {
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "not_found">("idle")
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [manualGeocoding, setManualGeocoding] = useState(false)

  // ── CEP → autopreenche rua e sugere bairro ──────────────────────────
  useEffect(() => {
    const digits = value.cep.replace(/\D/g, "")
    if (digits.length !== 8) {
      setCepStatus("idle")
      return
    }
    setCepStatus("loading")
    const timer = setTimeout(async () => {
      const result = await lookupCep(digits)
      if (!result) {
        setCepStatus("not_found")
        return
      }
      setCepStatus("idle")
      if (isBlockedCity(result.city)) {
        setBlockedMessage(BLOCKED_CITY_MESSAGE)
        onBlockedChange(true, result.city)
        return
      }
      setBlockedMessage(null)
      onBlockedChange(false)
      const matchedByName = zones.find((z) => normalize(z.name) === normalize(result.bairro))
      onChange({
        ...value,
        street: result.street || value.street,
        bairro: matchedByName ? matchedByName.name : value.bairro,
        bairroNotListed: matchedByName ? false : value.bairroNotListed,
      })
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.cep])

  // ── Bairro escolhido na lista: resolve a zona na hora, sem chamada de rede
  useEffect(() => {
    if (value.bairroNotListed) return
    if (!value.bairro) {
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    if (isBlockedCity(value.bairro)) {
      setBlockedMessage(BLOCKED_CITY_MESSAGE)
      onBlockedChange(true, value.bairro)
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    setBlockedMessage(null)
    onBlockedChange(false)
    const zone = zones.find((z) => z.name === value.bairro) ?? null
    onZoneResolved({ zone, approximate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.bairro, value.bairroNotListed, zones])

  // ── Fallback "meu bairro não está na lista": mesmo pipeline de texto
  // livre que o checkout já usava (matchDeliveryZone → geocoding externo).
  useEffect(() => {
    if (!value.bairroNotListed) return
    if (value.bairro.trim().length < 3) {
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    if (isBlockedCity(value.bairro)) {
      setBlockedMessage(BLOCKED_CITY_MESSAGE)
      onBlockedChange(true, value.bairro)
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    setBlockedMessage(null)
    onBlockedChange(false)

    const localZone = matchDeliveryZone(value.bairro, zones)
    if (localZone) {
      onZoneResolved({ zone: localZone, approximate: false })
      return
    }

    const timer = setTimeout(async () => {
      setManualGeocoding(true)
      try {
        const res = await fetch("/api/geocode-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: value.bairro }),
        })
        const data = await res.json()
        onZoneResolved({ zone: data.zone ?? null, approximate: !!data.approximate })
      } catch {
        onZoneResolved({ zone: null, approximate: false })
      } finally {
        setManualGeocoding(false)
      }
    }, 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.bairro, value.bairroNotListed, zones])

  return (
    <div className="checkout-address-grid" style={{ marginTop: 16 }}>
      <div>
        <label style={labelStyle}>CEP (opcional)</label>
        <input
          type="text"
          className="form-input"
          value={value.cep}
          onChange={(e) => onChange({ ...value, cep: e.target.value })}
          placeholder="00000-000"
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={9}
        />
        {cepStatus === "loading" && (
          <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Buscando endereço...</p>
        )}
        {cepStatus === "not_found" && (
          <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            CEP não encontrado — preencha o endereço manualmente.
          </p>
        )}
      </div>

      <div>
        <label style={labelStyle}>Endereço (rua e número)</label>
        <input
          type="text"
          className="form-input"
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          placeholder="Rua, número"
          autoComplete="street-address"
        />
      </div>

      <div>
        <label style={labelStyle}>Bairro</label>
        {!value.bairroNotListed ? (
          <select
            className="form-input"
            aria-label="Bairro"
            value={value.bairro}
            onChange={(e) => {
              const selected = e.target.value
              if (selected === NOT_LISTED_OPTION) {
                onChange({ ...value, bairro: "", bairroNotListed: true })
              } else {
                onChange({ ...value, bairro: selected, bairroNotListed: false })
              }
            }}
          >
            <option value="">Selecione seu bairro</option>
            {zones.map((z) => (
              <option key={z.name} value={z.name}>
                {z.name}
              </option>
            ))}
            <option value={NOT_LISTED_OPTION}>Meu bairro não está na lista</option>
          </select>
        ) : (
          <>
            <input
              type="text"
              className="form-input"
              value={value.bairro}
              onChange={(e) => onChange({ ...value, bairro: e.target.value })}
              placeholder="Digite o nome do seu bairro"
              autoFocus
            />
            <button
              type="button"
              onClick={() => onChange({ ...value, bairro: "", bairroNotListed: false })}
              style={{ fontSize: 12, color: "#5A6B2A", background: "none", border: "none", padding: "4px 0", cursor: "pointer" }}
            >
              ← Voltar pra lista de bairros
            </button>
          </>
        )}
      </div>

      <div>
        <label style={labelStyle}>Complemento (opcional)</label>
        <input
          type="text"
          className="form-input"
          value={value.complement}
          onChange={(e) => onChange({ ...value, complement: e.target.value })}
          placeholder="Apto, bloco, casa"
          autoComplete="address-line2"
        />
      </div>

      {blockedMessage && (
        <div style={{ gridColumn: "1 / -1" }}>
          <p style={{ fontSize: 13, color: "#B45309", fontWeight: 600 }}>{blockedMessage}</p>
        </div>
      )}

      {showFeeHint && !blockedMessage && manualGeocoding && (
        <div style={{ gridColumn: "1 / -1" }}>
          <p style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Identificando o bairro...</p>
        </div>
      )}
    </div>
  )
}
```

Nota de escopo: este componente usa suas próprias classes/estilos (mesmo
padrão visual do checkout, `form-input` + `checkout-address-grid` já
existentes em `globals.css`) em vez do wrapper `Field` do `ProfileModal`
(`AuthFormKit`) — trade-off cosmético aceito pra manter um único componente
compartilhado; o perfil vai ficar com o chrome do checkout nesses 4 campos,
não com o chrome padrão do resto do modal.

- [ ] **Step 5: Integrar no `CheckoutForm.tsx` — imports e estado**

No topo do arquivo, adicionar:
```ts
import AddressFields from "./AddressFields"
import type { DeliveryZone } from "@/lib/deliveryZones"
import {
  emptyDeliveryAddress,
  deliveryAddressFromUserMetadata,
  deliveryAddressToUserMetadataPatch,
  type DeliveryAddressData,
} from "@/lib/deliveryAddressMetadata"
```

Substituir os `useState` de `address`/`complement`/`addressState` (linhas 98-100) e `geocodedZone`/`geocodedApproximate`/`geocoding` (linhas 104-109) por:
```ts
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressData>(emptyDeliveryAddress())
  const [matchedZone, setMatchedZone] = useState<DeliveryZone | null>(null)
  const [zoneApproximate, setZoneApproximate] = useState(false)
  const [addressBlocked, setAddressBlocked] = useState(false)
  const [blockedCityText, setBlockedCityText] = useState("")
```
(`zones` continua como está, linha 101 — o tipo `{name, fee}[]` já é estruturalmente compatível com `DeliveryZone`.)

- [ ] **Step 6: Substituir a leitura de `user_metadata`/`localStorage` no `useEffect` de autopreenchimento**

No ramo de convidado (linhas 66-70), trocar:
```ts
          if (guest.address && !address) {
            setAddress(guest.address)
            setAddressState("valid")
            setDelivery("delivery")
          }
```
por:
```ts
          if (guest.address && !deliveryAddress.street) {
            setDeliveryAddress((prev) => ({ ...prev, street: guest.address }))
            setDelivery("delivery")
          }
```

No ramo de usuário logado (linhas 86-90), trocar:
```ts
    if (meta.delivery_address && !address) {
      setAddress(meta.delivery_address as string)
      setAddressState("valid")
      setDelivery("delivery")
    }
```
por:
```ts
    const savedAddress = deliveryAddressFromUserMetadata(meta)
    if (savedAddress.street && !deliveryAddress.street) {
      setDeliveryAddress(savedAddress)
      setDelivery("delivery")
    }
```

- [ ] **Step 7: Remover o `useEffect` de geocoding antigo e o cálculo local de `matchedZone`**

Remover inteiro o `useEffect` de fallback de geocoding (linhas 139-169, o que chama `/api/geocode-address` direto no `CheckoutForm`) — essa lógica agora vive dentro de `AddressFields`.

Trocar (linhas 315-322):
```ts
  const subtotal = mounted ? total() : 0
  const localMatchedZone = delivery === "delivery" ? matchDeliveryZone(address, zones) : null
  const matchedZone = localMatchedZone ?? geocodedZone
  const deliveryFee = matchedZone ? Number(matchedZone.fee) : 0
```
por:
```ts
  const subtotal = mounted ? total() : 0
  const deliveryFee = matchedZone ? Number(matchedZone.fee) : 0
```
Remover também o `import { matchDeliveryZone } from "@/lib/deliveryZones"` do topo do arquivo — depois deste Step, as duas únicas chamadas de `matchDeliveryZone` em `CheckoutForm.tsx` (linha 146, dentro do `useEffect` removido no início deste Step, e linha 316, substituída acima) deixam de existir, e o import ficaria sem uso.

- [ ] **Step 8: Atualizar `isFormValid`**

Linha 348-353, trocar:
```ts
  function isFormValid(): boolean {
    const nameOk = validateName(name)
    const phoneOk = validatePhone(phone)
    const addressOk = delivery === "pickup" || (address.trim().length >= 10 && !!matchedZone)
    return nameOk && phoneOk && addressOk
  }
```
por:
```ts
  function isFormValid(): boolean {
    const nameOk = validateName(name)
    const phoneOk = validatePhone(phone)
    const addressOk =
      delivery === "pickup" ||
      (deliveryAddress.street.trim().length >= 10 && !!matchedZone && !addressBlocked)
    return nameOk && phoneOk && addressOk
  }
```

- [ ] **Step 9: Atualizar o payload de `/api/orders` e o salvamento pós-pedido**

Linhas 371-373 (`fullAddress`), trocar:
```ts
      const fullAddress = delivery === "delivery"
        ? [address.trim(), complement.trim()].filter(Boolean).join(" - ")
        : undefined
```
por:
```ts
      const fullAddress = delivery === "delivery"
        ? [deliveryAddress.street.trim(), deliveryAddress.complement.trim()].filter(Boolean).join(" - ")
        : undefined
```

No body do fetch (linhas 377-393), trocar `address: delivery === "delivery" ? address.trim() : undefined,` e adicionar os dois campos novos logo abaixo de `deliveryAddress`:
```ts
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryType: delivery,
          address: delivery === "delivery" ? deliveryAddress.street.trim() : undefined,
          deliveryAddress: fullAddress,
          deliveryBairro: delivery === "delivery" ? matchedZone?.name : undefined,
          deliveryCityCheck:
            delivery === "delivery" ? (blockedCityText || deliveryAddress.bairro.trim() || undefined) : undefined,
          paymentMethod: payment,
          items: cartItems,
          total: finalTotal,
          riceChoices: activeRiceChoices,
        }),
```

Linhas 435-441 (salvamento de convidado em `localStorage`), trocar:
```ts
        if (!user) {
          localStorage.setItem("donna-fit-guest", JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            address: fullAddress ?? "",
          }))
        }
```
por (mesmo comportamento, só lendo do novo estado):
```ts
        if (!user) {
          localStorage.setItem("donna-fit-guest", JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            address: deliveryAddress.street.trim(),
          }))
        }
```

Linhas 444-455 (salvamento pós-pedido pro cliente logado), trocar:
```ts
      if (user) {
        try {
          const supabase = createClient()
          const updateData: Record<string, string> = {}
          if (delivery === "delivery" && fullAddress) {
            updateData.delivery_address = fullAddress
          }
          if (Object.keys(updateData).length > 0) {
            await supabase.auth.updateUser({ data: updateData })
          }
        } catch {}
      }
```
por:
```ts
      if (user && delivery === "delivery" && matchedZone) {
        try {
          const supabase = createClient()
          await supabase.auth.updateUser({
            data: deliveryAddressToUserMetadataPatch({ ...deliveryAddress, bairro: matchedZone.name }),
          })
        } catch {}
      }
```
(salva sempre o nome exato da zona resolvida em `bairro`, mesmo quando o cliente usou o fallback "não está na lista" — assim a próxima vez que ele voltar, o campo já vem com o bairro real cadastrado, não o texto livre digitado.)

- [ ] **Step 10: Trocar o JSX dos campos de endereço pelo `AddressFields`**

Substituir o bloco inteiro de linhas 641-711 (o `{delivery === "delivery" && (...)}` com os inputs de Endereço/Complemento e a mensagem de bairro identificado) por:
```tsx
        {delivery === "delivery" && (
          <>
            <AddressFields
              zones={zones}
              value={deliveryAddress}
              onChange={setDeliveryAddress}
              onZoneResolved={({ zone, approximate }) => {
                setMatchedZone(zone)
                setZoneApproximate(approximate)
              }}
              onBlockedChange={(blocked, cityText) => {
                setAddressBlocked(blocked)
                setBlockedCityText(cityText ?? "")
              }}
              showFeeHint
            />
            {deliveryAddress.street.trim().length >= 10 && !addressBlocked && (
              <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                {matchedZone && zoneApproximate ? (
                  <p style={{ fontSize: 12, color: "#5A6B2A", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={13} /> Bairro sem zona própria cadastrada — frete estimado pela zona mais
                    próxima ({matchedZone.name}): {formatCurrency(matchedZone.fee)}
                  </p>
                ) : matchedZone ? (
                  <p style={{ fontSize: 12, color: "#5A6B2A", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={13} /> Bairro identificado: {matchedZone.name} — frete {formatCurrency(matchedZone.fee)}
                  </p>
                ) : (
                  <p style={{ fontSize: 12, color: "#B45309", fontWeight: 600 }}>
                    Não conseguimos identificar o bairro. Selecione na lista ou fale pelo{" "}
                    <a href="https://wa.me/5541999154720" target="_blank" rel="noopener noreferrer" style={{ color: "#5A6B2A", textDecoration: "underline" }}>
                      WhatsApp
                    </a>.
                  </p>
                )}
              </div>
            )}
          </>
        )}
```

- [ ] **Step 11: Rodar o teste novo e confirmar que passa**

Terminal 1: `npm run dev -- -p 3001` (confirmar a porta real com `ss -ltnp` antes — já variou entre sessões, ver [[donna-fit-2-cpu-cores]]).
Terminal 2:
```bash
npx playwright test e2e/checkout-address-fields.spec.ts --project=chromium
```
Expected: PASS (4/4). Os testes de CEP e Nominatim batem em rede real (sem mock) — mesma convenção já usada em `e2e/checkout-delivery-fee.spec.ts`.

- [ ] **Step 12: Rodar a suíte de checkout/frete existente (já reescrita no Step 1) pra garantir que nada quebrou**

```bash
npx playwright test e2e/checkout-delivery-fee.spec.ts e2e/api-orders-integrity.spec.ts e2e/api-orders-stock-variants.spec.ts --project=chromium
```
Expected: PASS. Esses arquivos não deveriam mais citar o placeholder antigo
"Rua, número, bairro" nem a afirmação "não existe select de bairro" — já
reescritos no Step 1. Se algum outro teste (fora do escopo deste plano)
quebrar por depender do JSX antigo do checkout, ajustar só o seletor desse
teste, não o comportamento.

- [ ] **Step 13: Commit**

```bash
git add src/components/checkout/AddressFields.tsx src/components/checkout/CheckoutForm.tsx e2e/helpers.ts e2e/checkout-delivery-fee.spec.ts e2e/checkout-address-fields.spec.ts
git commit -m "feat(checkout): campos de CEP/bairro/complemento estruturados

Bairro deixa de ser adivinhado por texto — vira seleção explícita numa
lista fechada dos bairros atendidos (delivery_zones ativa), com sugestão
automática a partir do CEP (ViaCEP). Bloqueio de cidade (Campo Largo,
Araucária, Fazenda Rio Grande) mostrado em tela e desabilita o pedido.
Cliente logado tem o endereço salvo em user_metadata reaproveitado no
próximo pedido.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Integração no `ProfileModal.tsx`

**Files:**
- Modify: `src/components/ui/ProfileModal.tsx`
- Modify: `src/components/ui/AuthFormKit.tsx:118-139` (`PrimaryBtn` ganha prop `disabled` opcional)
- Test: `e2e/profile-address-fields.spec.ts`

**Interfaces:**
- Consumes: `AddressFields` (default export) de `src/components/checkout/AddressFields.tsx` (Task 5); `DeliveryAddressData`, `emptyDeliveryAddress`, `deliveryAddressFromUserMetadata`, `deliveryAddressToUserMetadataPatch` de `src/lib/deliveryAddressMetadata.ts`; `DeliveryZone` de `src/lib/deliveryZones.ts`; `login` de `e2e/helpers.ts` (Task 5, só no teste).

- [ ] **Step 1: Escrever o teste E2E (falha — perfil ainda usa o campo único de endereço)**

Criar `e2e/profile-address-fields.spec.ts`, reusando o `login()` extraído na
Task 5 (Step 1). Depois do `login()`, o modal fecha e o botão "Perfil" no
header precisa ser clicado de novo pra reabrir — agora mostrando o menu de
conta (já logado) em vez do formulário de login; se essa suposição não bater
com o comportamento real ao rodar o Step 2 abaixo, ajustar só essa parte de
navegação, sem mudar as asserções de endereço:
```ts
import { test, expect } from "@playwright/test"
import { login } from "./helpers"

test.describe("Perfil — endereço estruturado", () => {
  test("cliente logado salva CEP/bairro/complemento e vê tudo preenchido ao reabrir", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Perfil" }).click()
    await page.getByRole("button", { name: /editar perfil/i }).click()

    await page.getByPlaceholder("00000-000").fill("80010-000") // Rua José Loureiro, Centro, Curitiba
    await expect(page.getByLabel("Bairro")).toHaveValue("Centro", { timeout: 8000 })
    await page.getByPlaceholder("Apto, bloco, casa").fill("Sala 5")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Perfil atualizado!")).toBeVisible()

    await page.reload()
    await page.getByRole("button", { name: "Perfil" }).click()
    await page.getByRole("button", { name: /editar perfil/i }).click()
    await expect(page.getByLabel("Bairro")).toHaveValue("Centro")
    await expect(page.getByPlaceholder("Apto, bloco, casa")).toHaveValue("Sala 5")
  })

  test("endereço bloqueado desabilita o botão Salvar alterações", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Perfil" }).click()
    await page.getByRole("button", { name: /editar perfil/i }).click()

    await page.getByPlaceholder("00000-000").fill("83601-000") // Rua Centenário, Centro, Campo Largo/PR
    await expect(page.getByText("Ainda não entregamos em sua região")).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test e2e/profile-address-fields.spec.ts --project=chromium`
Expected: FAIL — os placeholders/labels novos ainda não existem no modal.

- [ ] **Step 3: Adicionar fetch de zonas ativas**

No topo do arquivo, adicionar imports:
```ts
import AddressFields from "@/components/checkout/AddressFields"
import type { DeliveryZone } from "@/lib/deliveryZones"
import {
  emptyDeliveryAddress,
  deliveryAddressFromUserMetadata,
  deliveryAddressToUserMetadataPatch,
  type DeliveryAddressData,
} from "@/lib/deliveryAddressMetadata"
```

Perto de onde os outros estados de edição são declarados (linhas 201-209), trocar `const [editAddress, setEditAddress] = useState("")` por:
```ts
  const [editDeliveryAddress, setEditDeliveryAddress] = useState<DeliveryAddressData>(emptyDeliveryAddress())
  const [editAddressBlocked, setEditAddressBlocked] = useState(false)
  const [zones, setZones] = useState<DeliveryZone[]>([])
```

Adicionar um `useEffect` pra buscar as zonas ativas (mesmo padrão de `CheckoutForm.tsx:111-124`, sem os campos de `store_settings` que só o checkout usa):
```ts
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("delivery_zones")
      .select("name, fee")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setZones(data ?? []))
  }, [])
```

- [ ] **Step 4: Atualizar o preenchimento ao entrar na view e a função de salvar**

Linha 238, trocar `setEditAddress(user.user_metadata?.delivery_address ?? "")` por:
```ts
      setEditDeliveryAddress(deliveryAddressFromUserMetadata(user.user_metadata))
```

Linha 405-407 (dentro de `handleEditProfile`), trocar:
```ts
    const { error: err } = await supabase.auth.updateUser({
      data: { name: editName.trim(), phone: cleanPhone, avatar_url: newAvatarUrl, delivery_address: editAddress.trim() || undefined },
    })
```
por:
```ts
    const { error: err } = await supabase.auth.updateUser({
      data: {
        name: editName.trim(),
        phone: cleanPhone,
        avatar_url: newAvatarUrl,
        ...deliveryAddressToUserMetadataPatch(editDeliveryAddress),
      },
    })
```

No topo de `handleEditProfile` (logo após a validação de nome, linha 382), adicionar a guarda de bloqueio:
```ts
    if (editAddressBlocked) { setEditError("Endereço fora da nossa área de entrega."); return }
```

- [ ] **Step 5: Trocar o JSX**

Substituir o `<Field label="Endereço de entrega" .../>` (linhas 805-817) por:
```tsx
                <AddressFields
                  zones={zones}
                  value={editDeliveryAddress}
                  onChange={setEditDeliveryAddress}
                  onZoneResolved={() => {}}
                  onBlockedChange={(blocked) => setEditAddressBlocked(blocked)}
                  showFeeHint={false}
                />
```

No botão de salvar (linha 819), desabilitar quando bloqueado:
```tsx
                <div style={{ marginTop: 8 }}>
                  <PrimaryBtn label="Salvar alterações" loading={editLoading} disabled={editAddressBlocked} />
                </div>
```

`PrimaryBtn` (`src/components/ui/AuthFormKit.tsx:118-139`) hoje só aceita
`{ label, loading }` e usa só `loading` pra desabilitar o botão. Adicionar
um `disabled` opcional que soma com `loading` sem mudar nenhum outro uso
existente do componente (todos os outros call sites continuam passando só
`label`/`loading`, então `disabled` fica `undefined` → `false` neles):
```tsx
export function PrimaryBtn({ label, loading: l, disabled }: { label: string; loading: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={l || disabled}
      style={{
        width: "100%", padding: "15px",
        background: l || disabled ? "#9DB08A" : "linear-gradient(135deg, #5A6B2A 0%, #7B9238 100%)",
        color: "#fff", border: "none", borderRadius: 13,
        fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, fontSize: 15,
        cursor: l || disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        marginTop: 6, boxShadow: l || disabled ? "none" : "0 6px 20px rgba(90,107,42,0.3)",
        transition: "all 0.2s", letterSpacing: "0.3px",
      }}
    >
      {l
        ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite" }} />
        : label
      }
    </button>
  )
}
```

- [ ] **Step 6: Rodar o teste novo e confirmar que passa**

```bash
npx playwright test e2e/profile-address-fields.spec.ts --project=chromium
```
Expected: PASS (2/2).

- [ ] **Step 7: Rodar a suíte inteira de checkout + perfil uma última vez**

```bash
npx playwright test e2e/checkout-address-fields.spec.ts e2e/profile-address-fields.spec.ts e2e/checkout-delivery-fee.spec.ts e2e/api-orders-integrity.spec.ts e2e/api-orders-blocked-city.spec.ts e2e/unit-blocked-cities.spec.ts e2e/unit-cep.spec.ts e2e/unit-delivery-address-metadata.spec.ts --project=chromium
```
Expected: PASS em todos.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/ProfileModal.tsx src/components/ui/AuthFormKit.tsx e2e/profile-address-fields.spec.ts
git commit -m "feat(perfil): campos de CEP/bairro/complemento estruturados no perfil

Reusa o AddressFields do checkout — mesmo cadastro de bairro fechado e
mesmo bloqueio de cidade não atendida, agora também editável direto no
perfil, não só no momento do pedido.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Fora de escopo (lembrete, ver spec)

- Persistência de endereço para convidado.
- Criar/aplicar `customer_profiles` em produção.
- Split de "endereço" em rua/número como campos separados.
- Múltiplos endereços salvos por cliente.
- UI de admin pra gerenciar a lista de cidades bloqueadas (fica como
  constante no código).
