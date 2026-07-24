"use client"
import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { RevenueChart, formatDayLabel } from "./RevenueChart"
import { RevenueStatCard } from "./RevenueStatCard"
import { DateRangePicker } from "./DateRangePicker"
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
  hideRevenue: boolean
  onToggleHideRevenue: () => void
}

export function RevenueDashboardModal({ open, onClose, hideRevenue, onToggleHideRevenue }: Props) {
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
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-black font-display">Faturamento</DialogTitle>
          <button
            type="button"
            onClick={onToggleHideRevenue}
            aria-label={hideRevenue ? "Mostrar faturamento" : "Ocultar faturamento"}
            aria-pressed={hideRevenue}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 text-gray-400 mr-6"
          >
            {hideRevenue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                aria-pressed={period === opt.key}
                className={
                  period === opt.key
                    ? "px-3 py-1.5 rounded-full text-sm font-semibold bg-brand-gold text-white font-ui"
                    : "px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 font-ui"
                }
              >
                {opt.label}
              </button>
            ))}

            {period === "custom" && (
              <DateRangePicker
                from={customFrom}
                to={customTo}
                onChange={(r) => {
                  setCustomFrom(r.from)
                  setCustomTo(r.to)
                }}
              />
            )}
          </div>

          {errorMsg && <p className="text-sm text-red-600 font-ui">{errorMsg}</p>}

          {period === "custom" && !range && (
            <p className="text-sm text-gray-400 font-ui">
              Selecione as duas datas para ver os dados.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RevenueStatCard
              label="Total de pedidos"
              value={String(summary?.totalOrders ?? 0)}
              current={summary?.totalOrders ?? 0}
              previous={summary?.previousPeriod?.totalOrders ?? 0}
              loading={loading}
              valueTestId="stat-total-orders"
              trendTestId="stat-total-orders-trend"
            />
            <RevenueStatCard
              label="Marmitas vendidas"
              value={String(summary?.totalItems ?? 0)}
              current={summary?.totalItems ?? 0}
              previous={summary?.previousPeriod?.totalItems ?? 0}
              loading={loading}
              valueTestId="stat-total-items"
              trendTestId="stat-total-items-trend"
            />
            <RevenueStatCard
              label="Faturamento total"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              current={summary?.totalRevenue ?? 0}
              previous={summary?.previousPeriod?.totalRevenue ?? 0}
              loading={loading}
              valueTestId="stat-total-revenue"
              trendTestId="stat-total-revenue-trend"
              valueClassName="text-brand-gold"
              blurred={hideRevenue}
            />
          </div>

          <Card className="rounded-2xl border-gray-100 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold font-ui text-gray-600">
                Faturamento por dia
              </CardTitle>
              <CardDescription className="font-ui">
                {range
                  ? `${formatDayLabel(range.from)} – ${formatDayLabel(range.to)}`
                  : "Selecione um período"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <RevenueChart data={summary?.series ?? []} loading={loading} blurred={hideRevenue} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
