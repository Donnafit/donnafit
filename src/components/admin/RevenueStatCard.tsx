"use client"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { computeTrend } from "@/lib/revenue-trend"
import { cn } from "@/lib/utils"

interface RevenueStatCardProps {
  label: string
  value: string
  current: number
  previous: number
  loading?: boolean
  valueTestId?: string
  trendTestId?: string
  valueClassName?: string
  blurred?: boolean
}

export function RevenueStatCard({
  label,
  value,
  current,
  previous,
  loading,
  valueTestId,
  trendTestId,
  valueClassName,
  blurred,
}: RevenueStatCardProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl border-gray-100 shadow-none bg-gray-50/60">
        <CardHeader className="p-4 pb-2 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
        </CardHeader>
        <CardFooter className="p-4 pt-0">
          <Skeleton className="h-3 w-32" />
        </CardFooter>
      </Card>
    )
  }

  const trend = computeTrend(current, previous)

  const badgeText =
    trend.direction === "new"
      ? "Novo"
      : trend.pct === 0
        ? "0%"
        : `${trend.pct !== null && trend.pct > 0 ? "+" : ""}${(trend.pct ?? 0).toFixed(1)}%`

  const Icon = trend.direction === "down" ? TrendingDown : trend.direction === "neutral" ? Minus : TrendingUp

  const badgeToneClass =
    trend.direction === "down"
      ? "border-red-200 bg-red-50 text-red-600"
      : trend.direction === "neutral"
        ? "border-gray-200 bg-gray-50 text-gray-500"
        : trend.direction === "new"
          ? "border-brand-gold/20 bg-brand-gold/10 text-brand-gold-dark"
          : "border-brand-green/20 bg-brand-green/10 text-brand-green-dark"

  const footerText =
    trend.direction === "down"
      ? "Queda esse período"
      : trend.direction === "neutral"
        ? "Estável esse período"
        : "Alta esse período"

  return (
    <Card className="rounded-2xl border-gray-100 shadow-none bg-gray-50/60">
      <CardHeader className="p-4 pb-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-xs font-medium text-gray-400 font-ui">
            {label}
          </CardDescription>
          <Badge
            variant="outline"
            data-testid={trendTestId}
            className={cn("gap-1 font-ui text-[11px] px-2 py-0.5", badgeToneClass)}
          >
            <Icon className="h-3 w-3" />
            {badgeText}
          </Badge>
        </div>
        <CardTitle
          className={cn("text-2xl font-black font-display text-gray-900", valueClassName)}
          data-testid={valueTestId}
          aria-label={blurred ? `${label} oculto` : undefined}
          style={blurred ? { filter: "blur(7px)", userSelect: "none" } : undefined}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardFooter className="p-4 pt-0">
        <p className="text-xs text-gray-400 font-ui">{footerText} vs. período anterior</p>
      </CardFooter>
    </Card>
  )
}
