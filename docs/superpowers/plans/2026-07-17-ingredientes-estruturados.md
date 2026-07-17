# Ingredientes estruturados (nome + quantidade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o textarea livre de "Ingredientes" no cadastro de produto por uma lista
estruturada (catálogo reaproveitável + quantidade/unidade por produto), editável no
formulário de Novo Produto e na tela Manual de Preparo, sem quebrar nenhuma tela do site
que já consome `products.description`.

**Architecture:** Duas tabelas novas (`ingredients` catálogo + `product_ingredients`
ligação), um módulo de funções puras de acesso a dados (`src/lib/productIngredients.ts`)
compartilhado pelos dois pontos de UI, e um componente `IngredientBuilder` (Popover +
Select do shadcn, restilizado com as variáveis CSS já usadas no painel) reaproveitado em
`ProductModal` (Estoque) e `ManualClient` (Manual de Preparo).

**Tech Stack:** Next.js 14 / React / TypeScript, Supabase (Postgres + RLS + PostgREST),
shadcn/ui (Popover, Select — via Radix), Playwright (e2e).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-17-ingredientes-estruturados-design.md` — toda
  tarefa abaixo implementa uma seção específica dessa spec.
- `description` só é sobrescrito quando a lista de ingredientes do produto **não está
  vazia**; lista vazia em um produto existente preserva a `description` já salva (não
  apaga texto legado). Ver spec, seção "Ao salvar".
- Nenhuma tela do site (`ProductCard.tsx`, `produto/[id]/page.tsx`, `CatalogClient.tsx`,
  `CheckoutForm.tsx`) é modificada — todas continuam lendo `product.description`.
- RLS de `ingredients`/`product_ingredients`: leitura para `authenticated`, escrita
  gated por `is_staff()` — mesmo nível de `products_admin_write` (migration
  `20260703_015`), não `is_admin()`.
- Popover/Select do shadcn usam classes Tailwind arbitrárias ligadas às variáveis CSS já
  existentes (`var(--surface-*)`, `var(--gold-*)`, `var(--text-*)`, definidas em
  `src/app/globals.css`) — não o tema padrão do shadcn.
- Migrations deste projeto são aplicadas via Supabase Management API (não há
  `supabase/config.toml` linkado) — usar o padrão já validado nesta sessão: ler
  `SUPABASE_ACCESS_TOKEN`/`NEXT_PUBLIC_SUPABASE_URL` de `.env.local`, extrair o project
  ref da URL, `POST https://api.supabase.com/v1/projects/{ref}/database/query` com
  `Authorization: Bearer <token>`.
- Rodar `npx tsc --noEmit` ao final de toda tarefa que toca `.ts`/`.tsx`.

---

### Task 1: Schema — tabelas `ingredients` e `product_ingredients`

**Files:**
- Create: `supabase/migrations/20260717_031_ingredient_catalog.sql`

**Interfaces:**
- Produz as tabelas `public.ingredients (id uuid, name text unique)` e
  `public.product_ingredients (id uuid, product_id uuid, ingredient_id uuid, quantity
  numeric, unit text, sort_order int)` que as Tasks 2–6 vão consultar via
  `supabase.from("ingredients")` / `supabase.from("product_ingredients")`.

- [ ] **Step 1: Escrever a migration**

```sql
-- ============================================================
-- Donna FIT — Catálogo de ingredientes + composição por produto
-- Migration: 20260717_031_ingredient_catalog.sql
--
-- Substitui o textarea livre "Ingredientes" (products.description) por uma
-- lista estruturada de nome + quantidade + unidade, reaproveitável entre
-- produtos via um catálogo. Mesmo padrão relacional de combo_items
-- (migration 20260716_026): tabela de catálogo + tabela de ligação,
-- apagando e reinserindo a cada save (ver ProductModal/ManualClient).
--
-- products.description é preservado como coluna (continua sendo o que o
-- site lê em ProductCard/produto/[id]/CatalogClient/CheckoutForm) mas
-- passa a ser gerado automaticamente a partir desta lista sempre que ela
-- não estiver vazia — ver src/lib/productIngredients.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ingredients (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_ingredients (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id    UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id UUID        NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity      NUMERIC     NOT NULL CHECK (quantity > 0),
  unit          TEXT        NOT NULL DEFAULT 'g',
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_ingredients_unique UNIQUE (product_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON public.product_ingredients(product_id);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer staff logado (precisa listar o catálogo e a composição
-- no cadastro de produto e no Manual de Preparo) — mesmo padrão de
-- combo_items_auth_read. Escrita: is_staff(), mesmo nível de
-- products_admin_write (migration 015) — quem já edita produto/modo de
-- preparo também cadastra ingrediente.
DROP POLICY IF EXISTS "ingredients_auth_read" ON public.ingredients;
CREATE POLICY "ingredients_auth_read"
  ON public.ingredients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ingredients_staff_write" ON public.ingredients;
CREATE POLICY "ingredients_staff_write"
  ON public.ingredients FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "product_ingredients_auth_read" ON public.product_ingredients;
CREATE POLICY "product_ingredients_auth_read"
  ON public.product_ingredients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "product_ingredients_staff_write" ON public.product_ingredients;
CREATE POLICY "product_ingredients_staff_write"
  ON public.product_ingredients FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
```

- [ ] **Step 2: Aplicar a migration no Supabase**

```bash
set -a && source .env.local && set +a
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#https://([^.]+)\.supabase\.co#\1#')
python3 -c "
import json
sql = open('supabase/migrations/20260717_031_ingredient_catalog.sql').read()
print(json.dumps({'query': sql}))
" > /tmp/migration_payload.json
curl -s -o /tmp/sb_migration_result.json -w "HTTP %{http_code}\n" \
  -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/migration_payload.json
cat /tmp/sb_migration_result.json
```

Expected: `HTTP 201` e corpo `[]` (sem erro).

- [ ] **Step 3: Confirmar que as tabelas e policies existem**

```bash
set -a && source .env.local && set +a
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#https://([^.]+)\.supabase\.co#\1#')
curl -s -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"select table_name from information_schema.tables where table_name in ('"'"'ingredients'"'"','"'"'product_ingredients'"'"');"}'
```

Expected: retorna as duas linhas `ingredients` e `product_ingredients`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260717_031_ingredient_catalog.sql
git commit -m "feat(db): tabelas ingredients e product_ingredients"
```

---

### Task 2: Scaffolding — Popover/Select do shadcn + módulo de dados

**Files:**
- Create (via CLI): `src/components/ui/popover.tsx`, `src/components/ui/select.tsx`
- Create: `src/lib/productIngredients.ts`

**Interfaces:**
- Produz (de `src/lib/productIngredients.ts`, consumido pelas Tasks 3–6):
  - `interface IngredientCatalogEntry { id: string; name: string }`
  - `interface IngredientRow { ingredientId: string; name: string; quantity: string; unit: string }`
  - `function buildIngredientsDescription(rows: IngredientRow[]): string | null`
  - `function fetchIngredientCatalog(supabase: any): Promise<IngredientCatalogEntry[]>`
  - `function createIngredient(supabase: any, name: string): Promise<IngredientCatalogEntry>`
  - `function fetchProductIngredients(supabase: any, productId: string): Promise<IngredientRow[]>`
  - `function saveProductIngredients(supabase: any, productId: string, rows: IngredientRow[]): Promise<void>`
- Produz (do shadcn CLI, consumido pela Task 3): `Popover, PopoverTrigger, PopoverContent`
  de `@/components/ui/popover`; `Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue` de `@/components/ui/select`.

- [ ] **Step 1: Instalar os componentes shadcn**

```bash
npx shadcn@latest add popover select --yes
```

Expected: cria `src/components/ui/popover.tsx` e `src/components/ui/select.tsx`, e
adiciona `@radix-ui/react-popover` e `@radix-ui/react-select` em `package.json`.

- [ ] **Step 2: Confirmar que os arquivos foram criados**

```bash
ls src/components/ui/popover.tsx src/components/ui/select.tsx
```

Expected: os dois caminhos existem, sem erro "No such file".

- [ ] **Step 3: Criar o módulo de dados**

Criar `src/lib/productIngredients.ts`:

```typescript
export interface IngredientCatalogEntry {
  id: string
  name: string
}

export interface IngredientRow {
  ingredientId: string
  name: string
  quantity: string
  unit: string
}

// Mesmo texto gerado nos dois pontos de save (ProductModal e ManualClient)
// — função única pra nunca divergir o formato entre os dois formulários.
// Ex: "Peito de frango grelhado (150g), Arroz integral (180g)". Lista
// vazia retorna null (equivalente a "sem descrição").
export function buildIngredientsDescription(rows: IngredientRow[]): string | null {
  const valid = rows.filter((r) => r.ingredientId && r.name && Number(r.quantity) > 0)
  if (valid.length === 0) return null
  return valid.map((r) => `${r.name} (${r.quantity}${r.unit})`).join(", ")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchIngredientCatalog(supabase: any): Promise<IngredientCatalogEntry[]> {
  const { data } = await supabase.from("ingredients").select("id, name").order("name")
  return data ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createIngredient(supabase: any, name: string): Promise<IngredientCatalogEntry> {
  const { data, error } = await supabase
    .from("ingredients")
    .insert({ name: name.trim() })
    .select("id, name")
    .single()
  if (error) throw error
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchProductIngredients(supabase: any, productId: string): Promise<IngredientRow[]> {
  const { data } = await supabase
    .from("product_ingredients")
    .select("ingredient_id, quantity, unit, sort_order, ingredients(name)")
    .eq("product_id", productId)
    .order("sort_order")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ingredientId: row.ingredient_id,
    name: row.ingredients?.name ?? "",
    quantity: String(row.quantity),
    unit: row.unit,
  }))
}

// Apaga tudo e reinsere — mesma estratégia já usada pra combo_items em
// ProductModal.handleSubmit. Lista vazia só apaga (não insere nada);
// quem decide se isso deve ou não mexer em products.description é quem
// chama esta função (ver regra de "só sobrescreve se não-vazia" na spec).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProductIngredients(supabase: any, productId: string, rows: IngredientRow[]): Promise<void> {
  await supabase.from("product_ingredients").delete().eq("product_id", productId)
  const valid = rows.filter((r) => r.ingredientId && Number(r.quantity) > 0)
  if (valid.length === 0) return
  const payload = valid.map((r, index) => ({
    product_id: productId,
    ingredient_id: r.ingredientId,
    quantity: Number(r.quantity),
    unit: r.unit.trim() || "g",
    sort_order: index,
  }))
  const { error } = await supabase.from("product_ingredients").insert(payload)
  if (error) throw error
}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/popover.tsx src/components/ui/select.tsx src/lib/productIngredients.ts package.json package-lock.json
git commit -m "feat: instala Popover/Select do shadcn e cria módulo productIngredients"
```

---

### Task 3: `IngredientBuilder` + integração no ProductModal (criação de produto)

**Files:**
- Create: `src/components/admin/IngredientBuilder.tsx`
- Modify: `src/components/admin/EstoqueClient.tsx` (`ProductModal`)
- Test: `e2e/admin-estoque.spec.ts`

**Interfaces:**
- Consome: tudo de `src/lib/productIngredients.ts` (Task 2); `Popover`/`Select` do
  shadcn (Task 2).
- Produz: `IngredientBuilder` — `{ rows: IngredientRow[], onChange: (rows:
  IngredientRow[]) => void, catalog: IngredientCatalogEntry[], onCreateIngredient:
  (name: string) => Promise<IngredientCatalogEntry> }`, exportado de
  `src/components/admin/IngredientBuilder.tsx`, consumido também pela Task 6
  (`ManualClient`).

- [ ] **Step 1: Criar o componente `IngredientBuilder`**

Criar `src/components/admin/IngredientBuilder.tsx`:

```tsx
"use client"
import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IngredientCatalogEntry, IngredientRow } from "@/lib/productIngredients"

const NEW_INGREDIENT_VALUE = "__new__"

interface IngredientBuilderProps {
  rows: IngredientRow[]
  onChange: (rows: IngredientRow[]) => void
  catalog: IngredientCatalogEntry[]
  onCreateIngredient: (name: string) => Promise<IngredientCatalogEntry>
}

export function IngredientBuilder({ rows, onChange, catalog, onCreateIngredient }: IngredientBuilderProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [newName, setNewName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("g")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  function resetForm() {
    setSelectedId("")
    setNewName("")
    setQuantity("")
    setUnit("g")
    setError("")
  }

  async function handleAdd() {
    setError("")
    if (!quantity || Number(quantity) <= 0) {
      setError("Informe uma quantidade válida.")
      return
    }

    let ingredientId = selectedId
    let name = catalog.find((c) => c.id === selectedId)?.name ?? ""

    if (selectedId === NEW_INGREDIENT_VALUE) {
      const trimmed = newName.trim()
      if (!trimmed) {
        setError("Informe o nome do novo ingrediente.")
        return
      }
      setCreating(true)
      try {
        const created = await onCreateIngredient(trimmed)
        ingredientId = created.id
        name = created.name
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar ingrediente.")
        setCreating(false)
        return
      }
      setCreating(false)
    }

    if (!ingredientId || !name) {
      setError("Selecione um ingrediente.")
      return
    }
    if (rows.some((r) => r.ingredientId === ingredientId)) {
      setError("Esse ingrediente já foi adicionado.")
      return
    }

    onChange([...rows, { ingredientId, name, quantity, unit: unit.trim() || "g" }])
    resetForm()
    setOpen(false)
  }

  function removeRow(ingredientId: string) {
    onChange(rows.filter((r) => r.ingredientId !== ingredientId))
  }

  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "var(--surface-50)", border: "1px solid var(--surface-200)",
    borderRadius: 9, padding: "8px 12px",
  }

  return (
    <div data-testid="ingredient-builder">
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {rows.map((row) => (
            <div key={row.ingredientId} data-testid="ingredient-row" style={rowStyle}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-950)" }}>
                {row.name} — {row.quantity}{row.unit}
              </span>
              <button
                type="button"
                onClick={() => removeRow(row.ingredientId)}
                aria-label={`Remover ${row.name}`}
                style={{
                  width: 26, height: 26, borderRadius: 7, border: "none",
                  background: "var(--surface-200)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <X size={12} strokeWidth={2.5} style={{ color: "var(--text-700)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm() }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer", padding: "4px 0",
              fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--gold-500)",
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Adicionar ingrediente
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 bg-[var(--surface-100)] border-[var(--surface-200)] text-[var(--text-950)] p-3 rounded-[14px] shadow-lg"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="bg-[var(--surface-50)] border-[var(--surface-200)] text-[13px] font-[var(--font-ui)] h-10">
                <SelectValue placeholder="Selecionar ingrediente" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--surface-100)] border-[var(--surface-200)]">
                {catalog.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[13px] font-[var(--font-ui)]">
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_INGREDIENT_VALUE} className="text-[13px] font-[var(--font-ui)] text-[var(--gold-500)]">
                  + Novo ingrediente…
                </SelectItem>
              </SelectContent>
            </Select>

            {selectedId === NEW_INGREDIENT_VALUE && (
              <input
                type="text"
                placeholder="Nome do novo ingrediente"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  width: "100%", fontFamily: "var(--font-ui)", fontSize: 13,
                  color: "var(--text-950)", background: "var(--surface-50)",
                  border: "1px solid var(--surface-200)", borderRadius: 9,
                  padding: "9px 10px", outline: "none", boxSizing: "border-box",
                }}
              />
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number" min="0" step="0.1"
                placeholder="Quantidade"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  flex: 1, fontFamily: "var(--font-ui)", fontSize: 13,
                  color: "var(--text-950)", background: "var(--surface-50)",
                  border: "1px solid var(--surface-200)", borderRadius: 9,
                  padding: "9px 10px", outline: "none", boxSizing: "border-box",
                }}
              />
              <input
                type="text"
                placeholder="Unidade"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  width: 72, fontFamily: "var(--font-ui)", fontSize: 13,
                  color: "var(--text-950)", background: "var(--surface-50)",
                  border: "1px solid var(--surface-200)", borderRadius: 9,
                  padding: "9px 10px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#DC2626", margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={creating}
              style={{
                width: "100%", padding: "9px", borderRadius: 9, border: "none",
                background: "var(--gold-500)", color: "#fff", cursor: creating ? "wait" : "pointer",
                fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
              }}
            >
              {creating ? "Criando…" : "Adicionar"}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

- [ ] **Step 2: Remover a textarea "Ingredientes" e ligar o `IngredientBuilder` no `ProductModal`**

Em `src/components/admin/EstoqueClient.tsx`:

1. Adicionar os imports no topo do arquivo (junto dos existentes):

```typescript
import { IngredientBuilder } from "./IngredientBuilder"
import {
  buildIngredientsDescription,
  createIngredient,
  fetchIngredientCatalog,
  fetchProductIngredients,
  saveProductIngredients,
  type IngredientCatalogEntry,
  type IngredientRow,
} from "@/lib/productIngredients"
```

2. No `form` state inicial do `ProductModal` (bloco `useState({ ... })`), remover a
   linha `description: productToEdit?.description ?? "",` (as linhas seguintes,
   `prep_instructions`, `sku` etc., continuam iguais).

3. Logo após a declaração de `const [comboComponents, setComboComponents] = useState<ComboComponentDraft[]>([])`
   e as duas linhas seguintes (`individualProducts`, `comboOptions`), adicionar:

```typescript
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([])
  const [ingredientCatalog, setIngredientCatalog] = useState<IngredientCatalogEntry[]>([])
```

4. Logo após o `useEffect` que carrega `categories` (o primeiro `useEffect` do
   componente), adicionar um novo `useEffect` pra carregar o catálogo:

```typescript
  useEffect(() => {
    const supabase = createClient()
    fetchIngredientCatalog(supabase).then(setIngredientCatalog)
  }, [])
```

5. Adicionar a função de criação inline (perto de `handleCopyFrom`):

```typescript
  async function handleCreateIngredient(name: string) {
    const supabase = createClient()
    const created = await createIngredient(supabase, name)
    setIngredientCatalog((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }
```

6. Substituir o bloco JSX do campo "Ingredientes" (a `<div>` com o `<label>Ingredientes</label>`
   e o `<textarea ... value={form.description} .../>`) por:

```tsx
          {/* Ingredientes */}
          <div>
            <label style={labelStyle}>Ingredientes</label>
            <IngredientBuilder
              rows={ingredientRows}
              onChange={setIngredientRows}
              catalog={ingredientCatalog}
              onCreateIngredient={handleCreateIngredient}
            />
          </div>
```

7. Em `handleSubmit`, logo antes de `const payload = {`, adicionar:

```typescript
    const generatedDescription = buildIngredientsDescription(ingredientRows)
```

8. No objeto `payload`, remover a linha `description: form.description.trim() || null,`
   e adicionar, como última propriedade do objeto literal (depois de
   `rice_integral_available: ...,`):

```typescript
      // Produto novo sempre grava a description gerada (mesmo null, igual ao
      // comportamento anterior de "sem descrição"). Produto existente só
      // sobrescreve quando há pelo menos 1 ingrediente — lista vazia não
      // apaga a description livre que já estava salva.
      ...(generatedDescription !== null || !productToEdit ? { description: generatedDescription } : {}),
```

9. Logo após o bloco `if (isCombo) { ... }` (composição de combo, que já grava
   `combo_items`) e antes de `onSaved(data as ProductWithCat); onClose()`, adicionar:

```typescript
    try {
      await saveProductIngredients(sb, data.id, ingredientRows)
    } catch (err) {
      setError(`Produto salvo, mas houve erro ao salvar os ingredientes: ${err instanceof Error ? err.message : "erro desconhecido"}`)
      setSaving(false)
      return
    }
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: sem erros. Se aparecer erro de tipo em `payload` por causa do spread
condicional, confirmar que `payload` está sendo construído como um único objeto
literal (sem `const payload: SomeType = ...` anotado) — a inferência de tipo do
TypeScript aceita o spread condicional em um objeto literal sem anotação explícita.

- [ ] **Step 4: Escrever o teste e2e (criação com ingredientes estruturados)**

Adicionar a `e2e/admin-estoque.spec.ts`, dentro de `test.describe("Admin — Estoque", ...)`,
depois do teste `"cria produto com ingredientes, modo de preparo e tipo de arroz..."`
já existente:

```typescript
  test("cria produto com lista estruturada de ingredientes e gera a description automaticamente", async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole("button", { name: /novo produto/i }).click()

    const productName = `${newProductName} — Ingredientes`
    await page.getByPlaceholder("Ex: Frango Grelhado com Arroz Integral (350g)").fill(productName)
    await page.getByPlaceholder("0,00").fill("19.90")
    await page.getByRole("button", { name: /^combo — pacote de produtos$/i }).click()
    await page.getByRole("button", { name: /^individual — produto único$/i }).click()

    // Primeiro ingrediente — cria "Peito de frango grelhado" no catálogo.
    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("Peito de frango grelhado")
    await page.getByPlaceholder("Quantidade").fill("150")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar" }).click()
    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Peito de frango grelhado" })).toBeVisible()

    // Segundo ingrediente.
    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("Arroz integral")
    await page.getByPlaceholder("Quantidade").fill("180")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar" }).click()
    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Arroz integral" })).toBeVisible()

    await page.getByRole("button", { name: /adicionar ao cardápio/i }).click()
    await expect(page.getByText("Preencha os dados para adicionar ao cardápio")).not.toBeVisible({ timeout: 8000 })

    const sb = adminClient()
    const { data: product } = await sb.from("products").select("id, description").eq("name", productName).single()
    expect(product?.description).toBe("Peito de frango grelhado (150g), Arroz integral (180g)")

    const { data: rows } = await sb
      .from("product_ingredients")
      .select("quantity, unit, ingredients(name)")
      .eq("product_id", product!.id)
      .order("sort_order")
    expect(rows).toHaveLength(2)
    expect((rows as any[])[0].ingredients.name).toBe("Peito de frango grelhado")
    expect(Number((rows as any[])[0].quantity)).toBe(150)

    await sb.from("products").delete().eq("name", productName)
  })
```

- [ ] **Step 5: Rodar o teste**

```bash
npx playwright test e2e/admin-estoque.spec.ts -g "lista estruturada de ingredientes"
```

Expected: `1 passed`. Se falhar, ler o erro de seletor antes de mudar o componente —
o teste já usa os `data-testid`/placeholders exatos definidos no `IngredientBuilder`
acima (`ingredient-row`, `Nome do novo ingrediente`, `Quantidade`, `Unidade`).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/IngredientBuilder.tsx src/components/admin/EstoqueClient.tsx e2e/admin-estoque.spec.ts
git commit -m "feat(estoque): campo de ingredientes estruturado (nome + quantidade) no cadastro de produto"
```

---

### Task 4: `ProductModal` — carregar ingredientes ao editar produto existente

**Files:**
- Modify: `src/components/admin/EstoqueClient.tsx` (`ProductModal`)
- Test: `e2e/admin-estoque.spec.ts`

**Interfaces:**
- Consome: `fetchProductIngredients` (Task 2), `ingredientRows`/`setIngredientRows`
  (Task 3).

- [ ] **Step 1: Carregar as linhas existentes ao abrir "Editar Produto"**

Em `src/components/admin/EstoqueClient.tsx`, logo após o `useEffect` que já carrega
`combo_items` quando `productToEdit.stock_type === "combo"` (o bloco que termina com
`}, [])` seguido do comentário `// eslint-disable-next-line react-hooks/exhaustive-deps`),
adicionar:

```typescript
  useEffect(() => {
    if (!productToEdit) return
    const supabase = createClient()
    fetchProductIngredients(supabase, productToEdit.id).then(setIngredientRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Escrever o teste e2e (editar ingredientes de um produto existente)**

Adicionar a `e2e/admin-estoque.spec.ts`, logo depois do teste da Task 3:

```typescript
  test("edita ingredientes de um produto existente — adiciona um, remove outro", async ({ page }) => {
    const productName = `${newProductName} — Edição Ingredientes`
    const sb = adminClient()

    const { data: product } = await sb.from("products").insert({
      name: productName, price: 19.9, stock_type: "individual", is_active: true,
    }).select("id").single()
    const { data: ingredient } = await sb.from("ingredients")
      .upsert({ name: "Brócolis no vapor" }, { onConflict: "name" })
      .select("id").single()
    await sb.from("product_ingredients").insert({
      product_id: product!.id, ingredient_id: ingredient!.id, quantity: 80, unit: "g", sort_order: 0,
    })

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar por nome ou SKU…").fill(productName)
    await page.getByRole("button", { name: `Editar ${productName}` }).click()

    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Brócolis no vapor" })).toBeVisible()

    // Adiciona um segundo ingrediente.
    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("Cenoura")
    await page.getByPlaceholder("Quantidade").fill("50")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar" }).click()

    // Remove o primeiro.
    await page.getByRole("button", { name: "Remover Brócolis no vapor" }).click()

    await page.getByRole("button", { name: /salvar altera/i }).click()
    await expect(page.getByText("Edite os detalhes do produto abaixo")).not.toBeVisible({ timeout: 8000 })

    const { data: rows } = await sb
      .from("product_ingredients")
      .select("quantity, ingredients(name)")
      .eq("product_id", product!.id)
    expect(rows).toHaveLength(1)
    expect((rows as any[])[0].ingredients.name).toBe("Cenoura")

    const { data: updated } = await sb.from("products").select("description").eq("id", product!.id).single()
    expect(updated?.description).toBe("Cenoura (50g)")

    await sb.from("products").delete().eq("id", product!.id)
  })
```

- [ ] **Step 4: Rodar o teste**

```bash
npx playwright test e2e/admin-estoque.spec.ts -g "edita ingredientes de um produto existente"
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/EstoqueClient.tsx e2e/admin-estoque.spec.ts
git commit -m "feat(estoque): carrega ingredientes existentes ao editar produto"
```

---

### Task 5: Manual de Preparo — exibir ingredientes estruturados (com fallback legado)

**Files:**
- Modify: `src/components/admin/ManualClient.tsx`
- Test: `e2e/admin-manual.spec.ts`

**Interfaces:**
- Consome: `fetchProductIngredients` (Task 2), `IngredientRow` (Task 2).

- [ ] **Step 1: Carregar os ingredientes do produto selecionado**

Em `src/components/admin/ManualClient.tsx`, adicionar o import:

```typescript
import { fetchProductIngredients, type IngredientRow } from "@/lib/productIngredients"
```

Logo após a declaração `const [saveError, setSaveError] = useState<string | null>(null)`,
adicionar:

```typescript
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([])
```

Logo após a função `selectProduct`, adicionar um `useEffect` que recarrega os
ingredientes toda vez que `selected` muda (cobre a seleção inicial e cliques
subsequentes na sidebar):

```typescript
  useEffect(() => {
    if (!selected) { setIngredientRows([]); return }
    const supabase = createClient()
    fetchProductIngredients(supabase, selected.id).then(setIngredientRows)
  }, [selected?.id])
```

- [ ] **Step 2: Substituir o bloco de visualização "Descrição / Ingredientes"**

Substituir o bloco JSX atual:

```tsx
                {/* Descrição */}
                {selected.description && (
                  <div style={{
                    background: "var(--surface-100)",
                    border: "1px solid var(--surface-200)",
                    borderRadius: 14, padding: "20px 24px",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.8px",
                      color: "var(--text-300)", marginBottom: 12,
                    }}>
                      Descrição / Ingredientes
                    </p>
                    <p style={{
                      fontFamily: "var(--font-ui)", fontSize: 13,
                      color: "var(--text-700)", lineHeight: 1.7, whiteSpace: "pre-line",
                    }}>
                      {selected.description}
                    </p>
                  </div>
                )}
```

por:

```tsx
                {/* Ingredientes */}
                {(ingredientRows.length > 0 || selected.description) && (
                  <div style={{
                    background: "var(--surface-100)",
                    border: "1px solid var(--surface-200)",
                    borderRadius: 14, padding: "20px 24px",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.8px",
                      color: "var(--text-300)", marginBottom: 12,
                    }}>
                      Ingredientes
                    </p>
                    {ingredientRows.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {ingredientRows.map((row) => (
                          <div
                            key={row.ingredientId}
                            data-testid="ingredient-row"
                            style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-700)" }}
                          >
                            <span>{row.name}</span>
                            <span style={{ fontWeight: 700, color: "var(--text-950)" }}>{row.quantity}{row.unit}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{
                        fontFamily: "var(--font-ui)", fontSize: 13,
                        color: "var(--text-700)", lineHeight: 1.7, whiteSpace: "pre-line",
                      }}>
                        {selected.description}
                      </p>
                    )}
                  </div>
                )}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 4: Escrever os testes e2e**

Adicionar a `e2e/admin-manual.spec.ts`, dentro de `test.describe("Admin — Manual de Preparo", ...)`:

```typescript
  test("produto com ingredientes estruturados mostra a lista organizada, sem precisar clicar", async ({ page }) => {
    const sb = adminClient()
    const { data: product } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Ingredientes ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
      description: "texto legado que deve ser substituído pela lista",
    }).select("id").single()
    const { data: ingredient } = await sb.from("ingredients")
      .upsert({ name: "Filé de tilápia" }, { onConflict: "name" })
      .select("id").single()
    await sb.from("product_ingredients").insert({
      product_id: product!.id, ingredient_id: ingredient!.id, quantity: 120, unit: "g", sort_order: 0,
    })

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("Manual Ingredientes")
    await page.getByText("Manual Ingredientes", { exact: false }).first().click()

    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Filé de tilápia" })).toBeVisible()
    await expect(page.getByText("120g")).toBeVisible()
    await expect(page.getByText("texto legado")).not.toBeVisible()

    await sb.from("products").delete().eq("id", product!.id)
  })

  test("produto legado sem ingredientes estruturados continua mostrando a description livre", async ({ page }) => {
    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("E2E_TEST")
    await page.getByText(fx.product.name, { exact: false }).first().click()

    // fx.product não tem linhas em product_ingredients — cai no fallback.
    await expect(page.getByText("Ingredientes")).toBeVisible()
    await expect(page.getByTestId("ingredient-row")).toHaveCount(0)
  })
```

Adicionar `adminClient` a este arquivo (mesmo helper usado em `admin-estoque.spec.ts`),
junto dos imports do topo:

```typescript
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

function adminClient() {
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
  )
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}
```

- [ ] **Step 5: Rodar os testes**

```bash
npx playwright test e2e/admin-manual.spec.ts -g "ingredientes"
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/ManualClient.tsx e2e/admin-manual.spec.ts
git commit -m "feat(manual-preparo): exibe ingredientes estruturados organizados, com fallback pra produto legado"
```

---

### Task 6: Manual de Preparo — editar ingredientes no mesmo modo de edição

**Files:**
- Modify: `src/components/admin/ManualClient.tsx`
- Test: `e2e/admin-manual.spec.ts`

**Interfaces:**
- Consome: `IngredientBuilder` (Task 3), `fetchIngredientCatalog`, `createIngredient`,
  `saveProductIngredients`, `buildIngredientsDescription` (Task 2).

- [ ] **Step 1: Adicionar estado de edição e catálogo**

Em `src/components/admin/ManualClient.tsx`, atualizar o import já feito na Task 5:

```typescript
import {
  buildIngredientsDescription,
  createIngredient,
  fetchIngredientCatalog,
  fetchProductIngredients,
  saveProductIngredients,
  type IngredientCatalogEntry,
  type IngredientRow,
} from "@/lib/productIngredients"
import { IngredientBuilder } from "./IngredientBuilder"
```

Logo após `const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([])`
(adicionado na Task 5), adicionar:

```typescript
  const [editIngredientRows, setEditIngredientRows] = useState<IngredientRow[]>([])
  const [ingredientCatalog, setIngredientCatalog] = useState<IngredientCatalogEntry[]>([])

  useEffect(() => {
    const supabase = createClient()
    fetchIngredientCatalog(supabase).then(setIngredientCatalog)
  }, [])

  async function handleCreateIngredient(name: string) {
    const supabase = createClient()
    const created = await createIngredient(supabase, name)
    setIngredientCatalog((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }
```

- [ ] **Step 2: Seedar `editIngredientRows` ao entrar em modo de edição**

Modificar `startEditing`:

```typescript
  function startEditing() {
    if (!selected) return
    setEditImageUrl(selected.image_url ?? "")
    setEditPrep(selected.prep_instructions ?? "")
    setEditIngredientRows(ingredientRows)
    setSaveError(null)
    setEditing(true)
  }
```

- [ ] **Step 3: Persistir os ingredientes e regerar `description` em `handleSave`**

Modificar `handleSave`:

```typescript
  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const generatedDescription = buildIngredientsDescription(editIngredientRows)
    const updatePayload: Record<string, unknown> = {
      image_url: editImageUrl.trim() || null,
      prep_instructions: editPrep.trim() || null,
    }
    // Mesma regra do ProductModal: só sobrescreve description se a lista
    // não estiver vazia — preserva texto legado quando o produto ainda não
    // foi migrado pra ingredientes estruturados.
    if (generatedDescription !== null) {
      updatePayload.description = generatedDescription
    }

    const { data, error } = await sb
      .from("products")
      .update(updatePayload)
      .eq("id", selected.id)
      .select("*, categories(name, slug)")
      .single()

    if (error) {
      setSaveError(error.message ?? "Erro ao salvar. Tente novamente.")
      setSaving(false)
      return
    }

    try {
      await saveProductIngredients(sb, selected.id, editIngredientRows)
    } catch (err) {
      setSaveError(`Modo de preparo salvo, mas houve erro ao salvar os ingredientes: ${err instanceof Error ? err.message : "erro desconhecido"}`)
      setSaving(false)
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === selected.id ? data : p)))
    setSelected(data)
    setIngredientRows(editIngredientRows)
    setEditing(false)
    setSaving(false)
  }
```

- [ ] **Step 4: Adicionar o `IngredientBuilder` ao card de edição**

No bloco `{editing ? (...) : ...}` (o card de edição que hoje só tem o `<textarea>` de
Modo de Preparo), adicionar o `IngredientBuilder` logo antes do `<textarea>`:

```tsx
                    <div style={{ marginBottom: 14 }}>
                      <label style={{
                        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--text-300)",
                        display: "block", marginBottom: 8,
                      }}>
                        Ingredientes
                      </label>
                      <IngredientBuilder
                        rows={editIngredientRows}
                        onChange={setEditIngredientRows}
                        catalog={ingredientCatalog}
                        onCreateIngredient={handleCreateIngredient}
                      />
                    </div>
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 6: Escrever o teste e2e**

Adicionar a `e2e/admin-manual.spec.ts`:

```typescript
  test("edita ingredientes direto pelo Manual de Preparo e reflete na visualização", async ({ page }) => {
    const sb = adminClient()
    const { data: product } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Editar Ingredientes ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
    }).select("id").single()

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("Manual Editar Ingredientes")
    await page.getByText("Manual Editar Ingredientes", { exact: false }).first().click()
    await page.getByRole("button", { name: "Editar" }).click()

    await page.getByRole("button", { name: /adicionar ingrediente/i }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "+ Novo ingrediente…" }).click()
    await page.getByPlaceholder("Nome do novo ingrediente").fill("Batata doce")
    await page.getByPlaceholder("Quantidade").fill("100")
    await page.getByPlaceholder("Unidade").fill("g")
    await page.getByRole("button", { name: "Adicionar" }).click()

    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Salvar")).not.toBeVisible({ timeout: 8000 })

    await expect(page.getByTestId("ingredient-row").filter({ hasText: "Batata doce" })).toBeVisible()

    const { data: updated } = await sb.from("products").select("description").eq("id", product!.id).single()
    expect(updated?.description).toBe("Batata doce (100g)")

    await sb.from("products").delete().eq("id", product!.id)
  })

  test("salvar modo de preparo sem mexer nos ingredientes não apaga a description legada", async ({ page }) => {
    const sb = adminClient()
    const legacyDescription = "Descrição legada que não pode sumir"
    const { data: product } = await sb.from("products").insert({
      name: `[E2E_TEST] Manual Preserva Legado ${fx.runTag}`, price: 19.9, stock_type: "individual", is_active: true,
      description: legacyDescription,
    }).select("id").single()

    await loginAdmin(page)
    await page.getByPlaceholder("Buscar produto...").fill("Manual Preserva Legado")
    await page.getByText("Manual Preserva Legado", { exact: false }).first().click()
    await page.getByRole("button", { name: "Editar" }).click()
    await page.getByPlaceholder(/descreva o passo a passo/i).fill("Aquecer por 3 minutos.")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Salvar")).not.toBeVisible({ timeout: 8000 })

    const { data: updated } = await sb.from("products").select("description").eq("id", product!.id).single()
    expect(updated?.description).toBe(legacyDescription)

    await sb.from("products").delete().eq("id", product!.id)
  })
```

- [ ] **Step 7: Rodar os testes**

```bash
npx playwright test e2e/admin-manual.spec.ts -g "ingredientes|legada"
```

Expected: `2 passed`.

- [ ] **Step 8: Rodar a suíte completa que toca os arquivos alterados, e o build**

```bash
npx playwright test e2e/admin-estoque.spec.ts e2e/admin-manual.spec.ts
npx tsc --noEmit
npm run build
```

Expected: todos os testes passam, typecheck limpo, build sem erro.

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/ManualClient.tsx e2e/admin-manual.spec.ts
git commit -m "feat(manual-preparo): permite editar ingredientes direto na tela, mesmo componente do cadastro"
```
