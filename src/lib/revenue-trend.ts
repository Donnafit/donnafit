export type TrendDirection = "up" | "down" | "neutral" | "new"

export interface Trend {
  direction: TrendDirection
  pct: number | null
}

/**
 * Compara o valor atual com o do período anterior equivalente.
 * `previous === 0` com `current > 0` não gera percentual (seria infinito) —
 * vira direction "new" em vez disso.
 */
export function computeTrend(current: number, previous: number): Trend {
  if (previous === 0) {
    if (current === 0) return { direction: "neutral", pct: 0 }
    return { direction: "new", pct: null }
  }

  const pct = ((current - previous) / previous) * 100
  if (pct > 0) return { direction: "up", pct }
  if (pct < 0) return { direction: "down", pct }
  return { direction: "neutral", pct: 0 }
}
