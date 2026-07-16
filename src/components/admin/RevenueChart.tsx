"use client"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import type { RevenueDayPoint } from "@/types"

interface Props {
  data: RevenueDayPoint[]
  loading?: boolean
}

function formatDayLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-")
  return `${d}/${m}`
}

export function RevenueChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-gray-400">
        Carregando gráfico…
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-gray-400">
        Sem dados para o período selecionado.
      </div>
    )
  }

  return (
    <div className="h-72" data-testid="revenue-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
          />
          <YAxis
            yAxisId="revenue"
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            width={80}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "Faturamento" ? [formatCurrency(Number(value)), name] : [value, name]
            }
            labelFormatter={(label) => formatDayLabel(String(label))}
          />
          <Legend />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Faturamento"
            stroke="#C89B3C"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            name="Pedidos"
            stroke="#60A5FA"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
