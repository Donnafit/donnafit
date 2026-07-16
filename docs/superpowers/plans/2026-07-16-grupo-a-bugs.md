# Grupo A — Bugs Diretos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir quatro bugs diretos e independentes do Donna FIT — reconhecimento de bairro quebrado por complemento no endereço, espaçamento da seta em dropdowns do admin, categoria escolhida dentro do popup "+" do cardápio que não filtra o grid, e overflow horizontal em telas mobile — cada um validado por teste e2e Playwright.

**Architecture:** Cada task é isolada e não depende das outras (podem ser feitas em paralelo por workers diferentes). Task 1 mexe em `src/lib/deliveryZones.ts` e `src/lib/geocoding.ts` (lógica pura, sem UI). Task 2 mexe em estilos inline de 3 componentes admin (`EstoqueClient.tsx`, `ManualClient.tsx`, `configuracoes/page.tsx`) — a investigação de código mostrou que o 4º arquivo citado no ticket original (`AnunciosClient.tsx`) não tem o bug descrito (ver nota na Task 2). Task 3 corrige um bug de ref compartilhado em `src/components/catalog/CategoryFilter.tsx` (cardápio, não admin) que faz o clique-fora fechar o popup de categorias antes do clique no item disparar o filtro. Task 4 é uma auditoria diagnóstico+fix: primeiro roda um teste que detecta overflow horizontal em 7 telas, depois corrige cada uma com base no que o teste apontar.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Playwright (e2e)

## Global Constraints

- Não existe Jest/Vitest nem nenhuma lib de teste unitário no projeto — toda validação é via Playwright e2e (`e2e/*.spec.ts`, `npx playwright test <arquivo> --project=chromium`, `baseURL` local `http://localhost:3001`, `npm run dev` precisa estar rodando antes).
- Seguir o estilo de código existente: componentes com `style={{...}}` inline (sem CSS Modules/styled-components), variáveis de design em `var(--gold-500)`, `var(--surface-100)` etc., `"use client"` no topo de componentes com estado.
- Não introduzir um componente `Select`/`Dropdown` compartilhado novo — cada arquivo já tem sua própria implementação local e isso está fora de escopo (ver Task 2).
- Não modificar rotas, autenticação, RLS/migrations do Supabase, ou lógica de negócio não relacionada ao bug em questão.
- Commits pequenos e frequentes — um commit por task (ou por sub-etapa, se a task tocar múltiplos arquivos independentes), seguindo o padrão `fix(escopo): descrição curta em português` já usado no histórico do repo (`git log`).
- Antes de escrever teste novo, sempre checar se já existe um spec relacionado e estender em vez de duplicar (padrão já seguido pelo repo — ex: `e2e/checkout-delivery-fee.spec.ts` já cobre bairro/frete).
- `e2e/.results/` é gitignored — usar essa pasta para qualquer screenshot gerado por teste.

---

### Task 1: Bairro não reconhecido quando o endereço tem complemento (A2/A6)

**Contexto real (verificado por leitura de código + chamada real ao Nominatim):**
`src/lib/deliveryZones.ts` (`matchDeliveryZone`) faz `normalizedAddress.includes(normalizedName)` — na prática, texto extra (complemento) em qualquer lugar da string **não impede** achar um nome de bairro que já esteja escrito literalmente, então esse caminho não quebra por si só. O bug real e comprovável está em `src/lib/geocoding.ts` (`geocodeToBairro`), que monta a query `${address}, Curitiba, PR, Brasil` com o endereço bruto — testei ao vivo contra a API pública do Nominatim (`https://nominatim.openstreetmap.org/search`) em 2026-07-16:

- `"Rua Marechal Deodoro, 630 - Sala 12, Curitiba, PR, Brasil"` → **resultado vazio** (`[]`) — bug reproduzido.
- `"Rua Marechal Deodoro, 630, Curitiba, PR, Brasil"` (complemento removido) → retorna `"suburb": "Centro"` — zona real ativa no banco, taxa R$ 10,00.
- `"Rua Padre Anchieta, 2000, apto 302, Curitiba, PR, Brasil"` → **resultado vazio** (`[]`) — bug reproduzido.
- `"Rua Padre Anchieta, 2000, Curitiba, PR, Brasil"` (complemento removido) → retorna `"suburb": "Campina do Siqueira"` — zona real ativa no banco, taxa R$ 12,00.

O endereço literal do ticket (`"Rua Nova Espenha, 2021 - Sobrado Verde"`) não geocodifica em nenhuma variação (rua não existe no OpenStreetMap) — por isso os dois exemplos acima (reais e verificados) substituem o exemplo do ticket no teste e2e.

**Fix:** criar `stripAddressComplement()` e aplicá-la dentro de `matchDeliveryZone` e `geocodeToBairro` (na fonte, não em cada call site — assim `src/app/api/orders/route.ts`, `src/app/api/geocode-address/route.ts` e `src/components/checkout/CheckoutForm.tsx` ganham o fix automaticamente, sem tocar em nenhum deles).

**Files:**
- Create: `src/lib/addressComplement.ts`
- Modify: `src/lib/deliveryZones.ts:1,6,18-19`
- Modify: `src/lib/geocoding.ts:1,21,24`
- Test: `e2e/checkout-delivery-fee.spec.ts` (estender — já existe suíte de bairro/frete nesse arquivo)

**Interfaces:**
- Produz: `stripAddressComplement(address: string): string`, exportada de `src/lib/addressComplement.ts`, consumida internamente por `matchDeliveryZone` e `geocodeToBairro`.
- Consumes: nada de outras tasks (independente).

- [ ] **Step 1: Estender o teste e2e com os 2 casos de complemento (esperando falhar)**

Abrir `e2e/checkout-delivery-fee.spec.ts` e adicionar, no final do arquivo (antes do fechamento do último `test.describe`, ou como um novo `test.describe` logo depois do existente), o seguinte bloco:

```ts
test.describe("Endereço com complemento não deve atrapalhar o reconhecimento do bairro", () => {
  test("endereço sem bairro escrito, mas com complemento 'Sala X', geocodifica corretamente", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder(/rua, número, bairro, complemento/i)
      .fill("Rua Marechal Deodoro, 630 - Sala 12")

    // Sem stripping, o Nominatim recebe a query poluída pelo complemento e
    // não geocodifica nada — o teste fica preso em "não conseguimos identificar".
    await expect(page.getByText(/bairro identificado: centro/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/frete r\$\s?10,00/i)).toBeVisible()
  })

  test("endereço sem bairro escrito, mas com complemento 'apto 302', geocodifica corretamente", async ({ page }) => {
    await addToCartAndGoToCheckout(page)
    await page.getByPlaceholder(/rua, número, bairro, complemento/i)
      .fill("Rua Padre Anchieta, 2000, apto 302")

    await expect(page.getByText(/bairro identificado: campina do siqueira/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/frete r\$\s?12,00/i)).toBeVisible()
  })
})

test.describe("API /api/orders — bairro com complemento também é resolvido no servidor", () => {
  test("endereço com complemento resolve o mesmo bairro que sem complemento", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {
        customerName: "Teste Complemento E2E",
        customerPhone: "41999994444",
        deliveryType: "delivery",
        deliveryAddress: "Rua Marechal Deodoro, 630 - Sala 12",
        paymentMethod: "card",
        items: [{
          product: { id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`, price: fx.product.price, stock_type: "avulso", category_id: null },
          quantity: 1,
        }],
        total: fx.product.price,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    const { data: order } = await adminClient().from("orders").select("total").eq("id", body.orderId).single()
    // Frete real do Centro (R$ 10) — só é possível se o servidor conseguiu
    // geocodificar o endereço com o complemento removido.
    expect(Number(order?.total)).toBeCloseTo(fx.product.price + 10, 2)
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falhar**

Run: `npx playwright test e2e/checkout-delivery-fee.spec.ts --project=chromium`
Expected: FAIL nos 3 novos testes — a mensagem "Bairro identificado: Centro" / "Bairro identificado: Campina do Siqueira" nunca aparece (o texto que aparece é "Não conseguimos identificar o bairro"), e o teste de API falha porque o pedido é rejeitado com 400 ou usa frete 0. Confirma que o bug existe hoje.

- [ ] **Step 3: Criar `src/lib/addressComplement.ts`**

```ts
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
```

- [ ] **Step 4: Aplicar em `src/lib/deliveryZones.ts`**

```diff
+import { stripAddressComplement } from "./addressComplement"
+
 export interface DeliveryZone {
   name: string
   fee: number
 }
@@
 export function matchDeliveryZone(address: string, zones: DeliveryZone[]): DeliveryZone | null {
-  const normalizedAddress = normalize(address)
+  const normalizedAddress = normalize(stripAddressComplement(address))
```

- [ ] **Step 5: Aplicar em `src/lib/geocoding.ts`**

```diff
+import { stripAddressComplement } from "./addressComplement"
+
 interface NominatimResult {
   ...
 }
@@
 export async function geocodeToBairro(address: string): Promise<string | null> {
   if (!address.trim()) return null

-  const query = `${address}, Curitiba, PR, Brasil`
+  const query = `${stripAddressComplement(address)}, Curitiba, PR, Brasil`
```

- [ ] **Step 6: Rodar teste, esperar passar**

Run: `npx playwright test e2e/checkout-delivery-fee.spec.ts --project=chromium`
Expected: PASS em todos os testes do arquivo (os 3 novos + os já existentes, que devem continuar passando — em especial os casos "Batel" e "sem bairro reconhecível", que não têm complemento e não podem ter regredido).

Nota: os testes que dependem do Nominatim real fazem chamada de rede a um serviço público rate-limited (~1 req/s). O `playwright.config.ts` já roda com `workers: 1` e `fullyParallel: false`, então não há concorrência entre specs — se o teste falhar por timeout/rede instável, rodar de novo isoladamente antes de investigar regressão de código.

- [ ] **Step 7: Commit**
```bash
git add src/lib/addressComplement.ts src/lib/deliveryZones.ts src/lib/geocoding.ts e2e/checkout-delivery-fee.spec.ts
git commit -m "fix(checkout): reconhece bairro mesmo com complemento no endereço

Sem separar complemento (apto/bloco/casa/sobrado/sala) do
logradouro+número, a query enviada ao Nominatim ficava poluída e
retornava vazio, forçando o cliente a reescrever o endereço sem
complemento pra conseguir finalizar o pedido."
```

---

### Task 2: Padding da seta em dropdowns customizados (A8)

**Nota de investigação (importante, leia antes de implementar):** o ticket original cita 4 arquivos com "dropdown customizado com seta colada na borda". Após ler os 4 arquivos linha a linha:

| Arquivo | O que existe de fato | Aplica o bug? |
|---|---|---|
| `src/components/admin/EstoqueClient.tsx` (`CustomDropdown`, linhas 70-106) | Dropdown de valor real (categoria/tipo), botão flex com `ChevronDown` como último item, `padding: compact ? "0 12px" : "10px 12px"` | **Sim** — 12px de respiro é o candidato real ao bug |
| `src/components/admin/ManualClient.tsx` (linhas 234-269) | `ChevronDown` é o indicador de **accordion** (abre/fecha lista de categoria no manual), não um seletor de valor. Padding do botão já é `"8px 16px"` | Parcialmente — visualmente parecido, cliente pode ter confundido; padding já é 16px mas vamos alinhar por consistência |
| `src/components/admin/AnunciosClient.tsx` (linhas 220-245) | `ChevronUp`/`ChevronDown` são botões de **reordenar item pra cima/baixo**, centralizados numa caixa 20×16px na **extremidade esquerda** da linha — longe de qualquer borda direita | **Não** — não existe o bug descrito aqui. Nenhuma mudança de código será feita neste arquivo |
| `src/app/admin/(protected)/configuracoes/page.tsx` (linhas 244, 251) | Dois `<select>` **nativos** (horário de abertura/fechamento), sem `appearance: none` nem ícone customizado — a seta é renderizada pelo navegador | Sem bug de CSS nosso pra corrigir (é chrome nativo do browser), mas aplicamos um `paddingRight` explícito por segurança/consistência, já que o arquivo foi citado nominalmente |

Ou seja: o fix de verdade é em `EstoqueClient.tsx`; os outros dois recebem um ajuste pequeno e seguro por consistência; `AnunciosClient.tsx` é documentado como não aplicável.

**Files:**
- Modify: `src/components/admin/EstoqueClient.tsx:62-106,753,756`
- Modify: `src/components/admin/ManualClient.tsx:234-269`
- Modify: `src/app/admin/(protected)/configuracoes/page.tsx:244,251`
- Test: `e2e/admin-dropdown-padding.spec.ts` (novo)

**Interfaces:**
- Produz: prop opcional `testId?: string` em `CustomDropdown` (interno a `EstoqueClient.tsx`, não exportado, não quebra nenhum outro consumidor).
- Consumes: nada de outras tasks (independente).

- [ ] **Step 1: Criar o teste de medição de espaçamento (esperando falhar)**

Criar `e2e/admin-dropdown-padding.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()

async function loginAdmin(page: Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
}

// Distância entre a borda direita do ícone e a borda direita do elemento pai —
// mede o "respiro" real em pixels, sem depender de comparação de screenshot
// (frágil). 14px é o mínimo aceitável de espaçamento visual.
async function rightGap(container: ReturnType<Page["locator"]>, icon: ReturnType<Page["locator"]>) {
  const [containerBox, iconBox] = await Promise.all([container.boundingBox(), icon.boundingBox()])
  if (!containerBox || !iconBox) throw new Error("Elemento não encontrado ou não visível")
  return (containerBox.x + containerBox.width) - (iconBox.x + iconBox.width)
}

test.describe("Admin — espaçamento da seta nos dropdowns", () => {
  test("filtro de categoria no Estoque tem respiro adequado entre seta e borda", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/estoque")
    const dropdown = page.getByTestId("stock-category-filter")
    const chevron = page.getByTestId("stock-category-filter-chevron")
    await expect(dropdown).toBeVisible()
    expect(await rightGap(dropdown, chevron)).toBeGreaterThanOrEqual(14)
  })

  test("accordion de categoria no Manual tem respiro adequado entre seta e borda", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/manual")
    const toggle = page.getByTestId("manual-category-toggle").first()
    const chevron = page.getByTestId("manual-accordion-chevron").first()
    await expect(toggle).toBeVisible()
    expect(await rightGap(toggle, chevron)).toBeGreaterThanOrEqual(18)
  })

  // Screenshots pra revisão visual manual — não há seta customizada pra medir
  // em Anúncios (setas são de reordenar, na esquerda) nem em Configurações
  // (select nativo, sem ícone no DOM), então aqui só garantimos que a tela
  // carrega e captura uma imagem de referência.
  test("screenshots de referência — Anúncios e Configurações", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/anuncios")
    await expect(page.getByRole("heading", { name: /an[uú]ncios/i })).toBeVisible()
    await page.screenshot({ path: "e2e/.results/admin-anuncios-dropdown.png" })

    await page.goto("/admin/configuracoes")
    await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible()
    await page.screenshot({ path: "e2e/.results/admin-configuracoes-dropdown.png" })
  })
})
```

- [ ] **Step 2: Rodar teste, esperar falhar**

Run: `npx playwright test e2e/admin-dropdown-padding.spec.ts --project=chromium`
Expected: FAIL nos dois primeiros testes — `getByTestId("stock-category-filter")` e `getByTestId("manual-category-toggle")` não existem ainda (os `data-testid` só serão adicionados no Step 3). O terceiro teste (screenshots) já deve passar, pois não depende do fix.

- [ ] **Step 3: Implementar em `EstoqueClient.tsx`**

Adicionar `testId` à interface e ao componente (linhas 62-70):

```diff
 interface DropdownOption { value: string; label: string }
 interface DropdownProps {
   value: string
   onChange: (v: string) => void
   options: DropdownOption[]
   placeholder?: string
   compact?: boolean
+  testId?: string
 }

-function CustomDropdown({ value, onChange, options, placeholder = "Selecionar", compact = false }: DropdownProps) {
+function CustomDropdown({ value, onChange, options, placeholder = "Selecionar", compact = false, testId }: DropdownProps) {
```

Ajustar o botão e o ícone (linhas 84-106):

```diff
   return (
-    <div ref={ref} style={{ position: "relative", width: "100%" }}>
+    <div ref={ref} data-testid={testId} style={{ position: "relative", width: "100%" }}>
       <button
         type="button"
         onClick={() => setOpen((p) => !p)}
         style={{
           width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
-          gap: 8, textAlign: "left",
+          gap: 10, textAlign: "left",
           fontFamily: "var(--font-ui)", fontSize: compact ? 12 : 13, fontWeight: 500,
           color: value ? "var(--text-950)" : "var(--text-300)",
           background: "var(--surface-50)",
           border: `1px solid ${open ? "rgba(200,155,60,0.6)" : "var(--surface-200)"}`,
-          borderRadius: 9, padding: compact ? "0 12px" : "10px 12px",
+          borderRadius: 9, padding: compact ? "0 16px 0 12px" : "10px 16px 10px 12px",
           height: compact ? 40 : "auto",
           cursor: "pointer",
           transition: "border-color 150ms",
           boxSizing: "border-box",
         }}
       >
         <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current}</span>
-        <ChevronDown size={compact ? 12 : 14} strokeWidth={2.5}
+        <ChevronDown data-testid={testId ? `${testId}-chevron` : undefined} size={compact ? 12 : 14} strokeWidth={2.5}
           style={{ color: "var(--gold-500)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms" }} />
       </button>
```

Aplicar o `testId` no filtro de categoria (linha 753):

```diff
-                <CustomDropdown value={catFilter} onChange={setCatFilter} options={catOptions} compact />
+                <CustomDropdown value={catFilter} onChange={setCatFilter} options={catOptions} compact testId="stock-category-filter" />
```

- [ ] **Step 4: Implementar em `ManualClient.tsx`**

```diff
                     <button
+                      data-testid="manual-category-toggle"
                       onClick={() => toggleCat(cat)}
                       style={{
                         width: "100%", textAlign: "left",
                         display: "flex", alignItems: "center", justifyContent: "space-between",
-                        padding: "8px 16px",
+                        padding: "8px 20px 8px 16px",
                         background: "var(--surface-50)",
                         border: "none",
                         borderBottom: "1px solid var(--surface-200)",
                         position: "sticky", top: 0, zIndex: 2,
                         cursor: "pointer",
                       }}
                     >
@@
                       <ChevronDown
+                        data-testid="manual-accordion-chevron"
                         size={12}
                         strokeWidth={2.5}
                         className={`cat-chevron${isOpen ? " open" : ""}`}
                         style={{ color: "var(--text-300)", flexShrink: 0 }}
                       />
                     </button>
```

- [ ] **Step 5: Ajustar `configuracoes/page.tsx` (consistência, sem regressão)**

```diff
-              <select value={settings.openHour} onChange={(e) => update("openHour", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
+              <select value={settings.openHour} onChange={(e) => update("openHour", e.target.value)} style={{ ...inputStyle, cursor: "pointer", paddingRight: 32 }}>
```
```diff
-              <select value={settings.closeHour} onChange={(e) => update("closeHour", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
+              <select value={settings.closeHour} onChange={(e) => update("closeHour", e.target.value)} style={{ ...inputStyle, cursor: "pointer", paddingRight: 32 }}>
```

- [ ] **Step 6: Rodar teste, esperar passar**

Run: `npx playwright test e2e/admin-dropdown-padding.spec.ts --project=chromium`
Expected: PASS nos 3 testes. Abrir os PNGs gerados em `e2e/.results/admin-anuncios-dropdown.png` e `e2e/.results/admin-configuracoes-dropdown.png` manualmente pra confirmar visualmente que não há problema real nesses dois — se algo aparecer, abrir uma task de acompanhamento específica (fora deste plano) em vez de forçar um fix não verificado aqui.

- [ ] **Step 7: Rodar regressão dos specs que já tocam esses componentes**

Run: `npx playwright test e2e/admin-estoque.spec.ts e2e/admin-manual.spec.ts e2e/admin-configuracoes.spec.ts --project=chromium`
Expected: PASS — nenhuma mudança de padding deve quebrar seletores existentes (nenhum teste usa `getByText`/`getByRole` baseado em padding).

- [ ] **Step 8: Commit**
```bash
git add src/components/admin/EstoqueClient.tsx src/components/admin/ManualClient.tsx "src/app/admin/(protected)/configuracoes/page.tsx" e2e/admin-dropdown-padding.spec.ts
git commit -m "fix(admin): aumenta respiro entre seta e borda nos dropdowns customizados

Filtro de categoria do Estoque tinha só 12px de padding entre o
ChevronDown e a borda direita do botão; alinhado com o accordion do
Manual (16→20px) e os selects nativos de horário em Configurações.
Anuncios.tsx investigado e descartado — as setas lá são de reordenar
item, na extremidade esquerda da linha, sem esse problema."
```

---

### Task 3: Botão "+" de categoria no cardápio não filtra ao clicar (A10)

**Correção de diagnóstico (o brief original estava errado — confirmado com o cliente):** o botão "+" **existe e abre o modal de categorias normalmente**. O bug é outro: clicar numa categoria **dentro** desse modal não filtra o grid de produtos — nada acontece. Os chips de categoria sempre visíveis (fora do modal) filtram normalmente.

**Causa raiz real (achada lendo o código):** `src/components/catalog/CategoryFilter.tsx` — o "+" abre um `DropdownMenu` (linhas 254-282 versão desktop, 293+ versão mobile) listando as categorias que não cabem nos chips. Só que **um único `dropdownRef` (linha 138) é compartilhado entre os containers desktop e mobile** — os dois ficam sempre montados no DOM ao mesmo tempo, só escondidos via classes Tailwind `hidden md:flex` / `flex md:hidden` (CSS, não renderização condicional). Como o bloco mobile é renderizado depois do desktop, `dropdownRef.current` sempre acaba apontando pro container **mobile**, não importa o viewport real.

O handler de "clique fora" (linhas 141-149) usa esse ref no evento `mousedown`:
```tsx
function handleOutside(e: MouseEvent) {
  if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
    setDropdownOpen(false)
  }
}
```
Em desktop, ao clicar numa categoria dentro do dropdown **desktop** (visível), `e.target` não está contido em `dropdownRef.current` (que na verdade referencia o container mobile escondido) — o clique é classificado errado como "fora", e `setDropdownOpen(false)` roda no `mousedown`, desmontando o `DropdownMenu` **antes** do evento `click` do botão da categoria disparar. Resultado: `onSelect(item.id)` (linha 103) nunca executa, o filtro nunca aplica. Os chips sempre visíveis não passam por esse ref/handler — chamam `handleSelect` direto no clique, por isso funcionam.

**Fix:** usar dois refs separados (desktop/mobile) e checar contra os dois no handler de clique fora.

**Files:**
- Modify: `src/components/catalog/CategoryFilter.tsx:138,141-149,255,293`
- Test: `e2e/storefront-navigation.spec.ts` (estender — já existe suíte de navegação/filtro de categoria nesse arquivo)

**Interfaces:**
- Consumes: nada de outras tasks (independente).
- Produces: nada consumido por outra task — fix isolado neste componente.

- [ ] **Step 1: Estender o teste e2e (esperando falhar)**

  Adicionar ao final do `test.describe("Cardápio — navegação e descoberta", ...)` em `e2e/storefront-navigation.spec.ts`:
  ```ts
  test("clicar numa categoria dentro do popup '+' (Ver todas as categorias) filtra o grid", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Ver todas as categorias" }).click()

    // Pega qualquer item do dropdown que não seja "Todos" (a categoria
    // escondida atrás do "+" varia conforme o catálogo, então usamos a
    // primeira disponível dentro do popup em vez de fixar um nome).
    const dropdownItem = page.locator("button", { hasText: /./ }).filter({ hasNot: page.getByText("Todos") })
    const menuButtons = page.getByRole("button").filter({ has: page.locator(":visible") })
    const categoryButton = page
      .locator('div[style*="position: absolute"] button, div[style*="position:absolute"] button')
      .first()
    await expect(categoryButton).toBeVisible({ timeout: 3000 })
    const categoryName = (await categoryButton.textContent())?.trim()
    await categoryButton.click()

    // Bug corrigido: o popup fecha E o grid realmente filtra por essa categoria
    // (antes do fix, nada acontecia — onSelect nunca era chamado).
    await expect(page.getByRole("button", { name: "Ver todas as categorias" })).toBeVisible()
    if (categoryName) {
      await expect(page.getByRole("button", { name: categoryName, exact: true }).last()).toHaveCSS("color", "rgb(200, 155, 60)")
    }
  })
  ```
  Nota: o seletor de item do dropdown usa a posição (`div[style*="position: absolute"] button`) porque o nome da categoria escondida varia conforme os dados de catálogo — não fixar um nome específico de categoria evita um teste frágil que quebra quando alguém reordena/renomeia categorias no admin.

- [ ] **Step 2: Rodar teste, esperar falhar**

  Run: `npx playwright test e2e/storefront-navigation.spec.ts --project=chromium`
  Expected: FAIL — depois de clicar no item do dropdown, o botão "Ver todas as categorias" já não está mais visível de novo a tempo (o dropdown nem chega a fechar do jeito esperado) ou a cor do chip correspondente nunca muda para a cor "ativa", confirmando que `onSelect` não foi chamado.

- [ ] **Step 3: Corrigir o ref compartilhado em `CategoryFilter.tsx`**

  Trocar a declaração do ref (linha 138):
  ```diff
-  const dropdownRef = useRef<HTMLDivElement>(null)
+  const dropdownRefDesktop = useRef<HTMLDivElement>(null)
+  const dropdownRefMobile = useRef<HTMLDivElement>(null)
  ```

  Trocar o handler de clique fora (linhas 141-149) para checar os dois refs:
  ```diff
   useEffect(() => {
     function handleOutside(e: MouseEvent) {
-      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
+      const target = e.target as Node
+      const insideDesktop = dropdownRefDesktop.current?.contains(target) ?? false
+      const insideMobile = dropdownRefMobile.current?.contains(target) ?? false
+      if (!insideDesktop && !insideMobile) {
         setDropdownOpen(false)
       }
     }
     if (dropdownOpen) document.addEventListener("mousedown", handleOutside)
     return () => document.removeEventListener("mousedown", handleOutside)
   }, [dropdownOpen])
  ```

  Trocar o container desktop (linha 255):
  ```diff
-            <div ref={dropdownRef} style={{ position: "relative" }}>
+            <div ref={dropdownRefDesktop} style={{ position: "relative" }}>
  ```

  Trocar o container mobile (linha 293):
  ```diff
-          <div style={{ marginLeft: "auto", position: "relative" }} ref={dropdownRef}>
+          <div style={{ marginLeft: "auto", position: "relative" }} ref={dropdownRefMobile}>
  ```

- [ ] **Step 4: Rodar teste, esperar passar**

  Run: `npx playwright test e2e/storefront-navigation.spec.ts --project=chromium`
  Expected: PASS em todos os testes do arquivo, incluindo o novo — clicar numa categoria dentro do popup "+" agora filtra o grid e marca o chip correspondente como ativo.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/catalog/CategoryFilter.tsx e2e/storefront-navigation.spec.ts
  git commit -m "fix(cardapio): categoria escolhida no popup + agora filtra o grid

  Um único dropdownRef era compartilhado entre os containers desktop e
  mobile do filtro de categoria (ambos sempre montados no DOM, só
  escondidos via CSS) — o ref sempre acabava apontando pro container
  mobile. Em desktop, isso fazia o handler de clique-fora fechar o
  popup no mousedown antes do clique no item disparar onSelect, então
  a categoria nunca era aplicada. Refs separados por viewport resolvem."
  ```

---

### Task 4: Auditoria de responsividade mobile (A17)

**Contexto:** este item foi pedido pelo cliente de forma genérica ("analisar e ajustar responsividade"), então o processo aqui é diferente das outras 3 tasks: primeiro um teste de **diagnóstico** (detecta overflow horizontal via `scrollWidth > clientWidth`), depois um fix por tela — cada fix só pode ser escrito depois de rodar o teste e ver o que ele aponta (não dá pra adivinhar qual elemento está estourando sem medir). Nota: o commit `6c6e5a1` (`fix(admin): libera scroll da página de Pedidos no mobile e corrige Kanban colado na lateral`) já mostra que `/admin/pedidos` recebeu ajuste de mobile antes — a expectativa é que essa tela tenha menos (ou nenhum) problema remanescente, mas ainda assim entra na auditoria pra confirmar.

**Files:**
- Test: `e2e/mobile-responsiveness.spec.ts` (novo)
- Modify: arquivos a determinar pelo resultado do Step 2 (candidatos prováveis, por padrão de bug mais comum: componentes de `/`, `/checkout`, `/confirmacao`, `src/app/admin/(protected)/pedidos/*`, `src/components/admin/EstoqueClient.tsx`, `src/app/admin/(protected)/cozinha/*`, `src/app/admin/(protected)/configuracoes/page.tsx` — só editar o que o teste realmente apontar)

**Interfaces:**
- Produz: teste de regressão de overflow horizontal reutilizável pra qualquer tela futura (basta adicionar mais um `test(...)` no mesmo describe).
- Consumes: nada de outras tasks (independente — pode rodar em paralelo com as Tasks 1-3).

- [ ] **Step 1: Criar o teste de detecção de overflow (código completo, genérico e já correto — isso NÃO depende de diagnóstico prévio)**

Criar `e2e/mobile-responsiveness.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test"
import { loadFixtures } from "./fixtures"

const fx = loadFixtures()
const MOBILE_VIEWPORT = { width: 390, height: 844 } // iPhone 12

async function loginAdmin(page: Page) {
  await page.goto("/acessoadmin")
  await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
  await page.getByPlaceholder("••••••••").fill(fx.admin.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }))
  expect(
    overflow.scrollWidth,
    `${label}: body.scrollWidth (${overflow.scrollWidth}) > clientWidth (${overflow.clientWidth}) — overflow horizontal detectado`
  ).toBeLessThanOrEqual(overflow.clientWidth + 1) // tolerância de 1px
}

test.describe("Responsividade mobile — sem overflow horizontal (viewport 390x844)", () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test("cardápio (/)", async ({ page }) => {
    await page.goto("/")
    await assertNoHorizontalOverflow(page, "Cardápio")
  })

  test("checkout (/checkout)", async ({ page }) => {
    await page.goto("/checkout")
    await assertNoHorizontalOverflow(page, "Checkout")
  })

  test("confirmação (/confirmacao)", async ({ page }) => {
    await page.goto("/confirmacao")
    await assertNoHorizontalOverflow(page, "Confirmação")
  })

  test("admin — pedidos (Kanban)", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/pedidos")
    await assertNoHorizontalOverflow(page, "Admin Pedidos")
  })

  test("admin — estoque", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/estoque")
    await assertNoHorizontalOverflow(page, "Admin Estoque")
  })

  test("admin — cozinha", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/cozinha")
    await assertNoHorizontalOverflow(page, "Admin Cozinha")
  })

  test("admin — configurações", async ({ page }) => {
    await loginAdmin(page)
    await page.goto("/admin/configuracoes")
    await assertNoHorizontalOverflow(page, "Admin Configurações")
  })
})
```

- [ ] **Step 2: Rodar o teste e anotar quais telas falham**

Run: `npx playwright test e2e/mobile-responsiveness.spec.ts --project=chromium`
Expected: o resultado aponta exatamente quais das 7 telas têm `scrollWidth > clientWidth` (overflow real) — algumas podem já passar de primeira (ex: `/admin/pedidos`, que recebeu fix de mobile no commit `6c6e5a1`). Anotar a lista de telas que falharam antes de continuar — os próximos steps só se aplicam às telas que realmente falharem aqui.

- [ ] **Step 3: Para cada tela que falhou — diagnosticar e corrigir**

Este step é deliberadamente investigativo, não um placeholder: o teste do Step 2 é o único jeito confiável de saber ONDE está o overflow (não dá pra adivinhar por leitura estática de CSS qual elemento estoura 390px de largura sem medir de verdade). Para cada tela reportada como FAIL:

1. Abrir a tela no navegador com DevTools em modo responsivo (390px) ou usar `npx playwright test e2e/mobile-responsiveness.spec.ts --project=chromium --headed --debug` pra pausar e inspecionar visualmente.
2. Rodar no console do navegador (ou via `page.evaluate` num teste temporário) o snippet abaixo pra achar o elemento culpado — ele varre todo o DOM e retorna os elementos cuja borda direita ultrapassa a largura da viewport:
   ```js
   [...document.querySelectorAll("*")].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth)
     .map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right }))
   ```
3. Abrir o arquivo correspondente ao componente encontrado e verificar os padrões mais comuns de overflow neste tipo de layout inline-style:
   - Largura fixa maior que a tela (`width: 700` em vez de `width: "100%"` ou `maxWidth`) → trocar por `width: "100%"` + `maxWidth: <valor original>`.
   - Container flex sem `minWidth: 0` em filhos com texto longo (o texto empurra a largura do flex item além do pai) → adicionar `minWidth: 0` ao filho.
   - Texto sem quebra em card estreito (nome de produto/endereço longo) → adicionar `wordBreak: "break-word"` ou `overflowWrap: "anywhere"` ao elemento de texto.
   - Padding/margin somado sem `boxSizing: "border-box"` estourando a largura do container pai → adicionar `boxSizing: "border-box"`.
   - Tabela/Kanban com `overflowX` não contido no elemento certo → mover `overflowX: "auto"` pro container interno correto e `overflow: "hidden"` no container externo (mesmo padrão já usado no fix do commit `6c6e5a1` pro Kanban de Pedidos — usar `git show 6c6e5a1` como referência de como esse mesmo tipo de bug foi resolvido antes nesta base de código).
4. Aplicar o ajuste mínimo necessário (normalmente 1-3 linhas de `style`) e rodar o teste específico daquela tela de novo antes de seguir pra próxima:
   ```bash
   npx playwright test e2e/mobile-responsiveness.spec.ts --project=chromium -g "<nome do teste da tela>"
   ```

- [ ] **Step 4: Rodar a suíte completa de novo, esperar passar em todas as 7 telas**

Run: `npx playwright test e2e/mobile-responsiveness.spec.ts --project=chromium`
Expected: PASS nas 7 telas.

- [ ] **Step 5: Rodar regressão ampla (evitar quebrar layout desktop)**

Run: `npx playwright test --project=chromium` (suíte completa, sem viewport mobile — confirma que os ajustes de CSS não quebraram nada em desktop, já que o projeto Playwright único configurado em `playwright.config.ts` usa `devices["Desktop Chrome"]` por padrão fora do `test.describe` desta task)
Expected: PASS em toda a suíte existente.

- [ ] **Step 6: Commit**
```bash
git add e2e/mobile-responsiveness.spec.ts <arquivos ajustados no Step 3>
git commit -m "fix(mobile): remove overflow horizontal em telas do storefront e admin

Auditoria com viewport 390x844 (iPhone 12) em cardápio, checkout,
confirmação e 4 telas do admin — teste novo mede scrollWidth vs
clientWidth do body em cada uma, evitando regressão futura."
```

### Critical Files for Implementation
- src/lib/deliveryZones.ts
- src/lib/geocoding.ts
- src/components/admin/EstoqueClient.tsx
- src/components/catalog/CategoryFilter.tsx
- e2e/checkout-delivery-fee.spec.ts
- e2e/admin-estoque.spec.ts
- e2e/storefront-navigation.spec.ts
