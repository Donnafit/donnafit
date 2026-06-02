"use client"
import { useState } from "react"
import { Save, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/types"

interface Props {
  products: Product[]
}

export function FreezerCountForm({ products }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.id, p.stock_quantity]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    setSaving(true)
    setError("")
    const supabase = createClient()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpc = supabase.rpc.bind(supabase) as any
      await Promise.all(
        products.map((p) =>
          rpc("adjust_stock", {
            p_product_id: p.id,
            p_new_quantity: counts[p.id] ?? p.stock_quantity,
            p_notes: "Contagem fisica do freezer",
          })
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
        <p className="text-yellow-400 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Informe a quantidade exata de cada item no freezer. O cardapio
            sera atualizado imediatamente apos salvar.
          </span>
        </p>
      </div>

      {/* Product rows */}
      {products.map((product) => {
        const qty = counts[product.id] ?? 0
        const isLow = qty > 0 && qty <= product.min_stock_alert
        const isEmpty = qty === 0

        return (
          <div
            key={product.id}
            className={`flex items-center gap-4 bg-gray-800 rounded-2xl p-4 border-2 transition-colors ${
              isEmpty
                ? "border-red-500/50"
                : isLow
                ? "border-yellow-500/40"
                : "border-gray-700"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm leading-tight">
                {product.name}
              </p>
              {product.sku && (
                <p className="text-xs text-gray-400 mt-0.5">
                  SKU #{product.sku}
                </p>
              )}
              {isEmpty && (
                <p className="text-xs text-red-400 mt-1">
                  Esgotado — nao aparece no cardapio
                </p>
              )}
              {isLow && !isEmpty && (
                <p className="text-xs text-yellow-400 mt-1">
                  Estoque baixo
                </p>
              )}
            </div>
            <Input
              type="number"
              min={0}
              max={999}
              value={counts[product.id] ?? 0}
              onChange={(e) =>
                setCounts((prev) => ({
                  ...prev,
                  [product.id]: Math.max(0, parseInt(e.target.value) || 0),
                }))
              }
              className="w-20 text-center text-lg font-bold h-12 rounded-xl bg-gray-700 border-gray-600 text-white"
            />
          </div>
        )
      })}

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-14 rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white font-bold text-base mt-2 gap-2"
      >
        {saved ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Salvo com sucesso!
          </>
        ) : saving ? (
          "Salvando..."
        ) : (
          <>
            <Save className="h-5 w-5" />
            Salvar Contagem do Freezer
          </>
        )}
      </Button>
    </div>
  )
}
