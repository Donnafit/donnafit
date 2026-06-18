import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://flofeotnbjzsydiuohce.supabase.co"
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsb2Zlb3RuYmp6c3lkaXVvaGNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzMjYyOCwiZXhwIjoyMDk2MDA4NjI4fQ.merArKLPaxN3p9x5J7WQxRWKu-R-1-JRmqWMgTNSm1g"

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Busca todos os produtos do seed antigo (criados em 2026-06-02)
const { data: oldProducts, error: fetchErr } = await supabase
  .from("products")
  .select("id, sku, name, created_at")
  .gte("created_at", "2026-06-02T00:00:00")
  .lt("created_at",  "2026-06-03T00:00:00")

if (fetchErr) { console.error("Erro ao buscar:", fetchErr.message); process.exit(1) }

console.log(`\n→ Encontrados ${oldProducts.length} produtos do seed antigo (02/06):`)
for (const p of oldProducts) {
  console.log(`  [${p.id}] ${p.name} (sku: ${p.sku ?? "—"})`)
}

const ids = oldProducts.map(p => p.id)

if (ids.length === 0) {
  console.log("\nNada para deletar.")
  process.exit(0)
}

// Deleta
const { error: delErr } = await supabase
  .from("products")
  .delete()
  .in("id", ids)

if (delErr) {
  console.error("\n✗ Erro ao deletar:", delErr.message)
  process.exit(1)
}

console.log(`\n✓ ${ids.length} produtos deletados com sucesso.`)

// Confirma o total restante
const { count } = await supabase
  .from("products")
  .select("id", { count: "exact", head: true })

console.log(`✓ Total restante no banco: ${count} produtos\n`)
