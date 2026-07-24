import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth"
import type { RevenueDayPoint, RevenueSummary } from "@/types"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 366

// América/São_Paulo é UTC-3 fixo (sem horário de verão desde 2019) — o
// popup calcula "hoje"/os filtros no browser do admin (Brasília), mas
// essa rota roda no servidor (Vercel/Node em UTC). Sem isso, meia-noite
// local do servidor ≠ meia-noite em Brasília, e pedidos feitos entre
// ~21h-23h59 (horário de loja) caem no bucket de dia ERRADO — era a
// causa do popup "dessincronizado" com os dados reais.
const BR_UTC_OFFSET_MS = 3 * 60 * 60 * 1000

/** Converte "YYYY-MM-DD" (data de calendário em Brasília) no instante UTC
 * correspondente à meia-noite (ou 23:59:59.999 se `endOfDay`) em Brasília. */
function brasiliaBoundaryToUtc(dateStr: string, endOfDay = false): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  const ms = endOfDay
    ? Date.UTC(y, m - 1, d, 23, 59, 59, 999)
    : Date.UTC(y, m - 1, d, 0, 0, 0, 0)
  return new Date(ms + BR_UTC_OFFSET_MS)
}

/** Data "de calendário" pura (sem hora), usada só pra aritmética de dias
 * (contagem de intervalo, iteração de buckets) — não representa um
 * instante real, por isso construída em UTC puro pra não depender do
 * timezone do processo Node. */
function calendarDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function calendarDayKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Chave de dia em Brasília "YYYY-MM-DD" a partir de um timestamp UTC real
 * (`orders.created_at`) — desloca pelo offset antes de ler os campos UTC,
 * assim um pedido feito às 23h de Brasília não vaza pro bucket do dia
 * seguinte só porque em UTC já virou o dia seguinte. */
function toBrasiliaDayKey(isoString: string): string {
  const shifted = new Date(new Date(isoString).getTime() - BR_UTC_OFFSET_MS)
  return calendarDayKey(shifted)
}

/** Soma pedidos (excluindo cancelados, já filtrado na query) em totais agregados. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aggregateOrders(orders: any[]) {
  let totalOrders = 0
  let totalItems = 0
  let totalRevenue = 0

  for (const order of orders) {
    const orderItemsQty = ((order.order_items ?? []) as { quantity: number }[]).reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    )
    totalOrders += 1
    totalItems += orderItemsQty
    totalRevenue += Number(order.total) || 0
  }

  return { totalOrders, totalItems, totalRevenue }
}

export async function GET(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: "Parâmetros 'from' e 'to' são obrigatórios no formato YYYY-MM-DD" },
      { status: 400 }
    )
  }

  const fromDate = calendarDate(from)
  const toDate = calendarDate(to)

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Datas inválidas" }, { status: 400 })
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return NextResponse.json({ error: "'from' não pode ser depois de 'to'" }, { status: 400 })
  }

  const rangeDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Intervalo máximo é de ${MAX_RANGE_DAYS} dias` },
      { status: 400 }
    )
  }

  // Início/fim do intervalo como instantes reais em Brasília (não no
  // timezone do processo Node).
  const rangeStart = brasiliaBoundaryToUtc(from)
  const rangeEnd = brasiliaBoundaryToUtc(to, true)

  // Período anterior equivalente: mesma duração, terminando no dia
  // imediatamente antes de 'from'. Usado pelos badges de tendência.
  const prevToDate = new Date(fromDate)
  prevToDate.setUTCDate(prevToDate.getUTCDate() - 1)
  const prevFromDate = new Date(prevToDate)
  prevFromDate.setUTCDate(prevFromDate.getUTCDate() - (rangeDays - 1))
  const prevRangeStart = brasiliaBoundaryToUtc(calendarDayKey(prevFromDate))
  const prevRangeEnd = brasiliaBoundaryToUtc(calendarDayKey(prevToDate), true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const [{ data, error }, { data: prevData, error: prevError }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, created_at, order_items(quantity)")
      .not("status", "eq", "cancelled")
      .gte("created_at", rangeStart.toISOString())
      .lte("created_at", rangeEnd.toISOString()),
    supabase
      .from("orders")
      .select("id, total, order_items(quantity)")
      .not("status", "eq", "cancelled")
      .gte("created_at", prevRangeStart.toISOString())
      .lte("created_at", prevRangeEnd.toISOString()),
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (prevError) {
    return NextResponse.json({ error: prevError.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = (data ?? []) as any[]

  // Zero-preenche todos os dias do intervalo, mesmo sem pedido nenhum —
  // sem isso o gráfico "pularia" dias vazios e a linha ligaria datas
  // distantes como se fossem consecutivas.
  const buckets = new Map<string, RevenueDayPoint>()
  for (
    let d = new Date(fromDate);
    d.getTime() <= toDate.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = calendarDayKey(d)
    buckets.set(key, { date: key, revenue: 0, orders: 0 })
  }

  let totalOrders = 0
  let totalItems = 0
  let totalRevenue = 0

  for (const order of orders) {
    const dayKey = toBrasiliaDayKey(order.created_at)
    const bucket = buckets.get(dayKey)
    const orderTotal = Number(order.total) || 0
    const orderItemsQty = ((order.order_items ?? []) as { quantity: number }[]).reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    )

    totalOrders += 1
    totalItems += orderItemsQty
    totalRevenue += orderTotal

    if (bucket) {
      bucket.revenue += orderTotal
      bucket.orders += 1
    }
  }

  const series = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))
  const previousPeriod = aggregateOrders(prevData ?? [])

  const response: RevenueSummary = { totalOrders, totalItems, totalRevenue, series, previousPeriod }
  return NextResponse.json(response)
}
