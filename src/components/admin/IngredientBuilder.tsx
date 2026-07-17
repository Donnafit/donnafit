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
          className="w-72 z-[1100] bg-[var(--surface-100)] border-[var(--surface-200)] text-[var(--text-950)] p-3 rounded-[14px] shadow-lg"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="bg-[var(--surface-50)] border-[var(--surface-200)] text-[13px] font-[var(--font-ui)] h-10">
                <SelectValue placeholder="Selecionar ingrediente" />
              </SelectTrigger>
              <SelectContent className="z-[1200] bg-[var(--surface-100)] border-[var(--surface-200)]">
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
