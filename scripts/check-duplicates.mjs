import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://flofeotnbjzsydiuohce.supabase.co"
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsb2Zlb3RuYmp6c3lkaXVvaGNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzMjYyOCwiZXhwIjoyMDk2MDA4NjI4fQ.merArKLPaxN3p9x5J7WQxRWKu-R-1-JRmqWMgTNSm1g"

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// 1. Total de produtos
const { data: all } = await supabase
  .from("products")
  .select("id, sku, name, is_active, stock_type, category_id, created_at")
  .order("name")

console.log(`\n══ TOTAL DE PRODUTOS NO BANCO: ${all.length} ══\n`)

// 2. Duplicados por nome
const byName = {}
for (const p of all) {
  const key = p.name.trim().toLowerCase()
  if (!byName[key]) byName[key] = []
  byName[key].push(p)
}
const dupNames = Object.entries(byName).filter(([, arr]) => arr.length > 1)
console.log(`── Duplicados por NOME: ${dupNames.length} grupos ──`)
for (const [name, items] of dupNames) {
  console.log(`  "${items[0].name}" × ${items.length}`)
  for (const p of items) {
    console.log(`    id=${p.id}  sku=${p.sku ?? "(vazio)"}  ativo=${p.is_active}  criado=${p.created_at.slice(0,10)}`)
  }
}

// 3. Duplicados por SKU
const bySku = {}
for (const p of all.filter(p => p.sku)) {
  const key = p.sku.trim().toLowerCase()
  if (!bySku[key]) bySku[key] = []
  bySku[key].push(p)
}
const dupSkus = Object.entries(bySku).filter(([, arr]) => arr.length > 1)
console.log(`\n── Duplicados por SKU: ${dupSkus.length} grupos ──`)
for (const [sku, items] of dupSkus) {
  console.log(`  sku="${sku}" × ${items.length}`)
  for (const p of items) {
    console.log(`    id=${p.id}  nome="${p.name}"  ativo=${p.is_active}  criado=${p.created_at.slice(0,10)}`)
  }
}

// 4. Produtos sem SKU
const noSku = all.filter(p => !p.sku)
console.log(`\n── Produtos SEM SKU: ${noSku.length} ──`)
for (const p of noSku) {
  console.log(`  id=${p.id}  nome="${p.name}"  ativo=${p.is_active}  tipo=${p.stock_type}`)
}

// 5. Produtos inativos
const inactive = all.filter(p => !p.is_active)
console.log(`\n── Produtos INATIVOS: ${inactive.length} ──`)
for (const p of inactive) {
  console.log(`  id=${p.id}  sku=${p.sku ?? "(vazio)"}  nome="${p.name}"`)
}

// 6. Resumo por data de criação
const byDate = {}
for (const p of all) {
  const d = p.created_at.slice(0,10)
  byDate[d] = (byDate[d] || 0) + 1
}
console.log(`\n── Produtos por data de criação ──`)
for (const [date, count] of Object.entries(byDate).sort()) {
  console.log(`  ${date}: ${count} produtos`)
}

console.log("\n")
