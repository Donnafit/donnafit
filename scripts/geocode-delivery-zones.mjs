// Popula lat/lng de todas as zonas em delivery_zones via Nominatim — rodar
// uma vez (e de novo sempre que uma zona nova for cadastrada sem coordenada).
// Necessário pro fallback de "zona mais próxima por distância" quando o
// endereço do cliente não bate com nenhum bairro cadastrado (ver
// src/lib/deliveryZones.ts:nearestZoneByDistance). Respeita o limite de uso
// da instância pública do Nominatim (~1 req/s) — não rodar em paralelo.
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// A grande maioria das zonas cadastradas é bairro de Curitiba — sem ancorar
// a cidade, o Nominatim várias vezes resolveu pro nome de uma cidade-homônima
// do interior do Paraná em vez do bairro (ex: "Guaíra" foi pra cidade de
// Guaíra na fronteira com o Paraguai, "Rebouças" pra cidade de Rebouças a
// ~140km — mesma classe de bug que motivou tirar o viés de Curitiba do
// geocoding de endereço de cliente, só que aqui o viés é correto: sabemos
// que ESTAS zonas específicas são bairros de Curitiba, não estamos
// adivinhando a partir de texto livre do cliente). As poucas exceções
// abaixo já são cidades próprias da região metropolitana.
const SEPARATE_CITY_ZONES = new Set([
  "Almirante Tamandaré",
  "Colombo",
  "São José dos Pinhais",
])

function queryFor(zoneName) {
  if (SEPARATE_CITY_ZONES.has(zoneName)) return `${zoneName}, PR, Brasil`
  if (zoneName === "Atuba (Colombo)") return "Atuba, Colombo, PR, Brasil"
  return `${zoneName}, Curitiba, PR, Brasil`
}

async function geocode(zoneName) {
  const query = queryFor(zoneName)
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&countrycodes=br&limit=1`
  const res = await fetch(url, {
    headers: { "User-Agent": "DonnaFIT-ZoneGeocode/1.0 (contato: donnafit)" },
  })
  if (!res.ok) return null
  const results = await res.json()
  const first = results[0]
  if (!first) return null
  return { lat: Number(first.lat), lng: Number(first.lon) }
}

async function main() {
  const { data: zones, error } = await sb
    .from("delivery_zones")
    .select("name, lat, lng")
    .order("name")
  if (error) throw error

  const all = process.argv.includes("--all")
  const pending = all ? zones : zones.filter((z) => z.lat === null || z.lng === null)
  console.log(`${zones.length} zonas no total, ${pending.length} sem coordenada.`)

  let ok = 0
  let failed = []
  for (const zone of pending) {
    const coords = await geocode(zone.name)
    if (!coords) {
      failed.push(zone.name)
      console.log(`✗ ${zone.name} — Nominatim não encontrou`)
    } else {
      const { error: updateErr } = await sb
        .from("delivery_zones")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("name", zone.name)
      if (updateErr) {
        failed.push(zone.name)
        console.log(`✗ ${zone.name} — erro ao salvar: ${updateErr.message}`)
      } else {
        ok++
        console.log(`✓ ${zone.name} → ${coords.lat}, ${coords.lng}`)
      }
    }
    await sleep(1100)
  }

  console.log(`\n${ok}/${pending.length} geocodadas com sucesso.`)
  if (failed.length > 0) {
    console.log(`Falharam (revisar manualmente): ${failed.join(", ")}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
