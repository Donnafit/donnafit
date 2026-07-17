import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth"
import type { RevenueDayPoint, RevenueSummary } from "@/types"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 366

/** Constrói uma Date à meia-noite local a partir de "YYYY-MM-DD" (evita
 * o parsing UTC que `new Date("YYYY-MM-DD")` faz por padrão). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Chave de dia local "YYYY-MM-DD" — mesma convenção usada no bucket. */
function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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

  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)

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

  // Fim do dia (23:59:59.999) local do parâmetro 'to', pra incluir o dia inteiro.
  const rangeEnd = new Date(
    toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999
  )

  // Período anterior equivalente: mesma duração, terminando no dia
  // imediatamente antes de 'from'. Usado pelos badges de tendência.
  const prevToDate = new Date(fromDate)
  prevToDate.setDate(prevToDate.getDate() - 1)
  const prevFromDate = new Date(prevToDate)
  prevFromDate.setDate(prevFromDate.getDate() - (rangeDays - 1))
  const prevRangeEnd = new Date(
    prevToDate.getFullYear(), prevToDate.getMonth(), prevToDate.getDate(), 23, 59, 59, 999
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const [{ data, error }, { data: prevData, error: prevError }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, created_at, order_items(quantity)")
      .not("status", "eq", "cancelled")
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", rangeEnd.toISOString()),
    supabase
      .from("orders")
      .select("id, total, order_items(quantity)")
      .not("status", "eq", "cancelled")
      .gte("created_at", prevFromDate.toISOString())
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
    d.setDate(d.getDate() + 1)
  ) {
    const key = toDayKey(d)
    buckets.set(key, { date: key, revenue: 0, orders: 0 })
  }

  let totalOrders = 0
  let totalItems = 0
  let totalRevenue = 0

  for (const order of orders) {
    const dayKey = toDayKey(new Date(order.created_at))
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
