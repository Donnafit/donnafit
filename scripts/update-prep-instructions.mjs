import { createClient } from "@supabase/supabase-js"
import xlsx from "xlsx"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = "https://flofeotnbjzsydiuohce.supabase.co"
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsb2Zlb3RuYmp6c3lkaXVvaGNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzMjYyOCwiZXhwIjoyMDk2MDA4NjI4fQ.merArKLPaxN3p9x5J7WQxRWKu-R-1-JRmqWMgTNSm1g"

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function cleanSku(sku) {
  return sku.toString().replace(/\s*\(.*?\)\s*$/, "").trim()
}

const wb = xlsx.readFile(join(__dirname, "../donna-fit-produtos.xlsx"))
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = xlsx.utils.sheet_to_json(ws, { defval: null })

const updates = rows
  .filter(r => r["ID/SKU"] && r["Preparo"])
  .map(r => ({
    sku: cleanSku(r["ID/SKU"]),
    prep_instructions: r["Preparo"].toString().trim(),
  }))

console.log(`→ Atualizando ${updates.length} produtos com instruções de preparo...`)

let ok = 0
for (const { sku, prep_instructions } of updates) {
  const { error } = await supabase
    .from("products")
    .update({ prep_instructions })
    .eq("sku", sku)

  if (error) {
    console.error(`  Erro SKU ${sku}:`, error.message)
  } else {
    ok++
  }
}

console.log(`\n✓ ${ok}/${updates.length} produtos atualizados.`)
