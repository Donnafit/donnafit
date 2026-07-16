"use client"
import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { RevenueChart } from "./RevenueChart"
import type { RevenueSummary } from "@/types"

type Period = "today" | "7d" | "30d" | "custom"

function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function rangeForPeriod(
  period: Period,
  customFrom: string,
  customTo: string
): { from: string; to: string } | null {
  const today = new Date()
  const todayKey = toDayKey(today)

  if (period === "today") return { from: todayKey, to: todayKey }

  if (period === "7d") {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    return { from: toDayKey(start), to: todayKey }
  }

  if (period === "30d") {
    const start = new Date(today)
    start.setDate(start.getDate() - 29)
    return { from: toDayKey(start), to: todayKey }
  }

  // custom
  if (!customFrom || !customTo) return null
  return { from: customFrom, to: customTo }
}

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "custom", label: "Personalizado" },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function RevenueDashboardModal({ open, onClose }: Props) {
  const [period, setPeriod] = useState<Period>("today")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const range = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo]
  )

  useEffect(() => {
    if (!open || !range) return

    let cancelled = false
    setLoading(true)
    setErrorMsg(null)

    fetch(`/api/dashboard/revenue?from=${range.from}&to=${range.to}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Erro ao carregar faturamento")
        return json as RevenueSummary
      })
      .then((json) => {
        if (!cancelled) setSummary(json)
      })
      .catch((err) => {
        if (!cancelled) setErrorMsg(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, range])

  // Reseta pro filtro padrão sempre que o popup fecha, pra não reabrir já
  // filtrado num período personalizado de uma sessão anterior.
  useEffect(() => {
    if (!open) {
      setPeriod("today")
      setCustomFrom("")
      setCustomTo("")
      setSummary(null)
      setErrorMsg(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Faturamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Filtros de período */}
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                aria-pressed={period === opt.key}
                className={
                  period === opt.key
                    ? "px-3 py-1.5 rounded-full text-sm font-semibold bg-brand-gold text-white"
                    : "px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                De
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Até
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  max={toDayKey(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          )}

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          {period === "custom" && !range && (
            <p className="text-sm text-gray-400">
              Selecione as duas datas para ver os dados.
            </p>
          )}

          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-400 mb-1">Total de pedidos</p>
              <p className="text-2xl font-black text-gray-900" data-testid="stat-total-orders">
                {loading ? "…" : summary?.totalOrders ?? 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-400 mb-1">Marmitas vendidas</p>
              <p className="text-2xl font-black text-gray-900" data-testid="stat-total-items">
                {loading ? "…" : summary?.totalItems ?? 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-400 mb-1">Faturamento total</p>
              <p className="text-2xl font-black text-brand-gold" data-testid="stat-total-revenue">
                {loading ? "…" : formatCurrency(summary?.totalRevenue ?? 0)}
              </p>
            </div>
          </div>

          {/* Gráfico */}
          <RevenueChart data={summary?.series ?? []} loading={loading} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
