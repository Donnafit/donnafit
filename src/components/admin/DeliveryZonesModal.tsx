"use client"
import { useEffect, useState } from "react"
import { X, Search, Check, Plus, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Zone {
  name: string
  fee: number
  active: boolean
}

export function DeliveryZonesModal({ onClose }: { onClose: () => void }) {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [savingName, setSavingName] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [newName, setNewName] = useState("")
  const [newFee, setNewFee] = useState("")

  async function load() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { data, error: err } = await supabase.from("delivery_zones").select("name, fee, active").order("name")
    if (err) setError(err.message)
    else setZones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveZone(name: string, patch: Partial<Zone>) {
    setSavingName(name)
    setError("")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { error: err } = await supabase.from("delivery_zones").update(patch).eq("name", name)
    if (err) {
      setError(`Não foi possível salvar "${name}": ${err.message}`)
    } else {
      setZones((prev) => prev.map((z) => (z.name === name ? { ...z, ...patch } : z)))
    }
    setSavingName(null)
  }

  async function addZone() {
    const name = newName.trim()
    const fee = Number(newFee.replace(",", "."))
    if (!name || !Number.isFinite(fee) || fee < 0) return
    setError("")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { error: err } = await supabase.from("delivery_zones").insert({ name, fee, active: true })
    if (err) {
      setError(`Não foi possível adicionar "${name}": ${err.message}`)
      return
    }
    setNewName("")
    setNewFee("")
    load()
  }

  const filtered = zones.filter((z) => z.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 201, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, pointerEvents: "none" }}>
        <div
          data-testid="delivery-zones-modal"
          style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "85vh",
            display: "flex", flexDirection: "column", pointerEvents: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--surface-200)" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 16, color: "var(--text-950)", margin: 0 }}>Taxas de entrega por bairro</h2>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>{zones.length} bairros cadastrados</p>
            </div>
            <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface-50)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--surface-200)" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-300)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar bairro..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10, border: "1px solid var(--surface-200)", fontFamily: "var(--font-ui)", fontSize: 13 }}
              />
            </div>
          </div>

          {error && (
            <div style={{ margin: "12px 24px 0", background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 10, padding: "8px 12px", fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
            {loading ? (
              <p style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--text-300)" }}>Carregando...</p>
            ) : (
              filtered.map((zone) => (
                <div key={zone.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--surface-100)" }}>
                  <span style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 13, color: zone.active ? "var(--text-950)" : "var(--text-300)" }}>
                    {zone.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>R$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={zone.fee}
                    onBlur={(e) => {
                      const fee = Number(e.target.value)
                      if (Number.isFinite(fee) && fee >= 0 && fee !== zone.fee) saveZone(zone.name, { fee })
                    }}
                    style={{ width: 64, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--surface-200)", fontFamily: "var(--font-ui)", fontSize: 13, textAlign: "right" }}
                  />
                  <button
                    onClick={() => saveZone(zone.name, { active: !zone.active })}
                    title={zone.active ? "Desativar bairro" : "Ativar bairro"}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: "1px solid var(--surface-200)",
                      background: zone.active ? "#F0F4E8" : "var(--surface-50)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {savingName === zone.name ? <Loader2 size={13} className="animate-spin" /> : zone.active ? <Check size={13} color="#5A6B2A" /> : <X size={13} color="var(--text-300)" />}
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 8, padding: "16px 24px", borderTop: "1px solid var(--surface-200)" }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Novo bairro"
              style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--surface-200)", fontFamily: "var(--font-ui)", fontSize: 13 }}
            />
            <input
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              placeholder="Taxa"
              inputMode="decimal"
              style={{ width: 80, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--surface-200)", fontFamily: "var(--font-ui)", fontSize: 13 }}
            />
            <button
              onClick={addZone}
              disabled={!newName.trim() || !newFee.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "none",
                background: "var(--gold-500)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13,
                cursor: !newName.trim() || !newFee.trim() ? "not-allowed" : "pointer",
                opacity: !newName.trim() || !newFee.trim() ? 0.5 : 1,
              }}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
