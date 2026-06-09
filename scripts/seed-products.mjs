import { createClient } from "@supabase/supabase-js"
import xlsx from "xlsx"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Credenciais ───────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://flofeotnbjzsydiuohce.supabase.co"
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsb2Zlb3RuYmp6c3lkaXVvaGNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzMjYyOCwiZXhwIjoyMDk2MDA4NjI4fQ.merArKLPaxN3p9x5J7WQxRWKu-R-1-JRmqWMgTNSm1g"

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Mapeamento de categorias ──────────────────────────────────────────────────
const CAT_MAP = {
  "vegetariano":    { name: "Vegetariano",    slug: "vegetariano",    sort_order: 6 },
  "carne vermelha": { name: "Carne Vermelha", slug: "carne-vermelha", sort_order: 2 },
  "frango":         { name: "Frango",         slug: "frango",         sort_order: 3 },
  "low carb":       { name: "Low Carb",       slug: "low-carb",       sort_order: 5 },
  "sopas":          { name: "Sopas e Caldos", slug: "sopas-e-caldos", sort_order: 4 },
  "massas":         { name: "Massas",         slug: "massas",         sort_order: 7 },
  "peixe":          { name: "Peixe",          slug: "peixe",          sort_order: 8 },
  "combos":         { name: "Combos",         slug: "combos",         sort_order: 1 },
  "adicionais":     { name: "Adicionais",     slug: "adicionais",     sort_order: 9 },
}

function driveUrl(raw) {
  const first = (raw || "").toString().trim().split("\n")[0].trim()
  const m = first.match(/\/d\/([a-zA-Z0-9_\-]+)/)
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : null
}

function cleanSku(sku) {
  return sku.toString().replace(/\s*\(.*?\)\s*$/, "").trim()
}

// ── Leitura da planilha ───────────────────────────────────────────────────────
const wb = xlsx.readFile(join(__dirname, "../donna-fit-produtos.xlsx"))
const ws = wb.Sheets[wb.SheetNames[0]]
const rawRows = xlsx.utils.sheet_to_json(ws, { defval: null })

// ── 1. Upsert categorias ──────────────────────────────────────────────────────
console.log("→ Inserindo categorias...")
const categorias = Object.values(CAT_MAP)
const { error: catErr } = await supabase
  .from("categories")
  .upsert(categorias, { onConflict: "slug" })

if (catErr) { console.error("Erro categorias:", catErr.message); process.exit(1) }
console.log(`  ✓ ${categorias.length} categorias`)

// ── 2. Buscar IDs das categorias ──────────────────────────────────────────────
const { data: catRows } = await supabase.from("categories").select("id, slug")
const slugToId = Object.fromEntries(catRows.map(c => [c.slug, c.id]))

// ── 3. Montar produtos ────────────────────────────────────────────────────────
const produtos = rawRows
  .filter(r => r["ID/SKU"])
  .map((r, i) => {
    const catKey  = (r["Categoria"] || "").toLowerCase().trim()
    const catInfo = CAT_MAP[catKey]
    const catId   = catInfo ? slugToId[catInfo.slug] : null
    const isCombo = catKey === "combos"

    return {
      sku:             cleanSku(r["ID/SKU"]),
      name:            (r["Nome"] || "").trim(),
      description:     (r["Descrição"] || r["Descri??o"] || r["Descricao"] || "").toString().trim().replace(/\n/g, " "),
      price:           parseFloat((r["Preço"] || r["Preco"] || r["Pre??o"] || 0).toString().replace(",", ".")),
      image_url:       driveUrl(r["Fotos"]),
      category_id:     catId,
      stock_type:      isCombo ? "combo" : "avulso",
      stock_quantity:  50,
      is_active:       true,
      sort_order:      i + 1,
    }
  })

console.log(`→ Inserindo ${produtos.length} produtos...`)

// Insere em lotes de 20
const BATCH = 20
let ok = 0
for (let i = 0; i < produtos.length; i += BATCH) {
  const batch = produtos.slice(i, i + BATCH)
  const { error } = await supabase
    .from("products")
    .upsert(batch, { onConflict: "sku" })

  if (error) {
    console.error(`  Erro lote ${i}-${i+BATCH}:`, error.message)
  } else {
    ok += batch.length
    console.log(`  ✓ ${ok}/${produtos.length}`)
  }
}

console.log("\nConcluído!")
