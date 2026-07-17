"use client"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import type { RevenueDayPoint } from "@/types"

interface Props {
  data: RevenueDayPoint[]
  loading?: boolean
}

const chartConfig = {
  revenue: {
    label: "Faturamento",
    color: "#C89B3C",
  },
} satisfies ChartConfig

export function formatDayLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-")
  return `${d}/${m}`
}

export function RevenueChart({ data, loading }: Props) {
  if (loading) {
    return <Skeleton className="h-72 w-full rounded-2xl" data-testid="revenue-chart-skeleton" />
  }

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-gray-400 font-ui">
        Sem dados para o período selecionado.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full" data-testid="revenue-chart">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#F0F0F0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDayLabel}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
        />
        <YAxis
          tickFormatter={(v: number) => formatCurrency(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          width={80}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatDayLabel(String(label))}
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="monotone"
          fill="url(#revenueFill)"
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
