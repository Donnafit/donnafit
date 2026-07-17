# Redesign do popup de Faturamento (RevenueDashboardModal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar visualmente o popup de faturamento (`RevenueDashboardModal`) usando o padrão `dashboard-01` do shadcn/ui (cards de KPI com badge de tendência, area chart com gradiente, seletor de datas por calendário) como referência, mantendo a paleta e tipografia da Donna FIT.

**Architecture:** O modal existente é quebrado em 3 subcomponentes novos/reescritos (`RevenueStatCard`, `RevenueChart`, `DateRangePicker`) compostos pelo `RevenueDashboardModal`. A API `/api/dashboard/revenue` passa a calcular também os totais do período anterior equivalente, usados pelos badges de tendência. Nenhuma mudança fora desse popup (o tile "Faturamento" do `AdminHero.tsx` continua igual).

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (`new-york` style, `neutral` base), Recharts 3.x, Supabase, Playwright (e2e).

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-17-revenue-dashboard-redesign-design.md`.
- Cores: verde de alta = `brand-green`/`brand-green-dark` (`#5A6B2A`/`#3D4A1C`); vermelho de queda = `red-600`/`red-50` (mesmo tom já usado em `errorMsg` no modal atual); dourado do gráfico/destaque = `brand-gold` (`#C89B3C`).
- Fontes: números grandes em `font-display` (Montserrat), texto auxiliar em `font-ui` (Plus Jakarta Sans) — nenhuma fonte nova.
- `data-testid="stat-total-orders"`, `data-testid="stat-total-items"`, `data-testid="stat-total-revenue"` e `data-testid="revenue-chart"` já são usados pelo e2e existente (`e2e/admin-revenue-dashboard.spec.ts`) e devem continuar existindo, contendo **apenas o valor numérico/gráfico** (nenhum badge ou texto extra dentro desses elementos).
- O projeto não tem test runner unitário (só Playwright e2e via `@playwright/test`, sem vitest/jest) — não introduzir um novo framework de teste só para esta feature; a verificação é via e2e + `npm run build` (typecheck).
- Fora de escopo: `src/components/admin/AdminHero.tsx` (o tile que abre o popup não muda).
- Responsividade é requisito explícito: grid de stat cards colapsa em 1 coluna abaixo do breakpoint `sm`, o popover do seletor de datas usa 1 mês só (não 2), e o modal não pode gerar overflow horizontal em viewport mobile (375px).

---

### Task 1: Instalar componentes shadcn `chart` e `calendar`

**Files:**
- Create (via CLI): `src/components/ui/chart.tsx`, `src/components/ui/calendar.tsx`
- Modify: `package.json`, `package-lock.json` (novas deps: `react-day-picker`, `date-fns`)

**Interfaces:**
- Produces: `ChartContainer`, `ChartConfig` (type), `ChartTooltip`, `ChartTooltipContent` de `@/components/ui/chart`; `Calendar` de `@/components/ui/calendar` — usados pelas Tasks 4 e 5.

- [ ] **Step 1: Rodar o CLI do shadcn para adicionar os dois componentes**

```bash
npx shadcn@latest add chart calendar --yes
```

- [ ] **Step 2: Verificar que os arquivos foram criados**

```bash
ls src/components/ui/chart.tsx src/components/ui/calendar.tsx
```
Expected: os dois caminhos listados sem erro "No such file or directory".

- [ ] **Step 3: Conferir se a versão do `recharts` não foi rebaixada**

```bash
grep '"recharts"' package.json
```
Expected: uma versão `^3.x` (o projeto já usa `^3.9.2`; o pacote `chart` do shadcn pede `recharts@3.8.0`, mas não deve fazer downgrade de uma versão maior compatível). Se o comando mostrar algo como `"recharts": "3.8.0"` sem o `^` anterior ou um major diferente de 3, rode `npm install recharts@^3.9.2` e repita este step.

- [ ] **Step 4: Rodar o build para confirmar que os novos arquivos compilam**

```bash
npm run build
```
Expected: build conclui sem erros de TypeScript (os arquivos novos ainda não são importados por ninguém, então isso só valida que eles compilam isoladamente).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/ui/chart.tsx src/components/ui/calendar.tsx
git commit -m "chore: instala componentes shadcn chart e calendar"
```

---

### Task 2: API retorna totais do período anterior (`previousPeriod`)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/api/dashboard/revenue/route.ts`
- Modify: `e2e/admin-revenue-dashboard.spec.ts`

**Interfaces:**
- Produces: `RevenueSummary.previousPeriod: { totalOrders: number; totalItems: number; totalRevenue: number }` — consumido pela Task 3 (`RevenueStatCard`) e Task 6 (`RevenueDashboardModal`).

- [ ] **Step 1: Atualizar o tipo `RevenueSummary`**

Em `src/types/index.ts`, substituir:

```ts
export interface RevenueSummary {
  totalOrders: number
  totalItems: number
  totalRevenue: number
  series: RevenueDayPoint[]
}
```

por:

```ts
export interface RevenueSummary {
  totalOrders: number
  totalItems: number
  totalRevenue: number
  series: RevenueDayPoint[]
  previousPeriod: {
    totalOrders: number
    totalItems: number
    totalRevenue: number
  }
}
```

- [ ] **Step 2: Escrever o teste e2e (falha primeiro)**

Em `e2e/admin-revenue-dashboard.spec.ts`, adicionar um novo `test` dentro do `test.describe` existente, logo após o teste atual:

```ts
  test("API retorna previousPeriod com totais do período anterior", async ({ page }) => {
    await loginAdmin(page)

    const todayKey = new Date().toISOString().slice(0, 10)
    const res = await page.request.get(`/api/dashboard/revenue?from=${todayKey}&to=${todayKey}`)
    expect(res.ok()).toBeTruthy()

    const json = await res.json()
    expect(typeof json.previousPeriod?.totalOrders).toBe("number")
    expect(typeof json.previousPeriod?.totalItems).toBe("number")
    expect(typeof json.previousPeriod?.totalRevenue).toBe("number")
  })
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "previousPeriod"
```
Expected: FAIL — `json.previousPeriod` é `undefined`, então `typeof undefined?.totalOrders` é `"undefined"`, não `"number"`.

- [ ] **Step 4: Implementar o cálculo do período anterior na API**

Em `src/app/api/dashboard/revenue/route.ts`, adicionar a função auxiliar `aggregateOrders` antes de `export async function GET` e alterar o corpo do handler para consultar também o período anterior. Arquivo completo resultante:

```ts
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
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "previousPeriod"
```
Expected: PASS.

- [ ] **Step 6: Rodar o teste e2e original pra garantir que não quebrou**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "abre popup"
```
Expected: PASS (mesmo comportamento de antes, `previousPeriod` é um campo a mais na resposta que esse teste não verifica).

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/app/api/dashboard/revenue/route.ts e2e/admin-revenue-dashboard.spec.ts
git commit -m "feat(faturamento): API calcula totais do período anterior equivalente"
```

---

### Task 3: Helper `computeTrend` + componente `RevenueStatCard`

**Files:**
- Create: `src/lib/revenue-trend.ts`
- Create: `src/components/admin/RevenueStatCard.tsx`

**Interfaces:**
- Consumes: nenhuma dependência de tasks anteriores além de `cn` (`@/lib/utils`) e componentes shadcn já existentes (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter`, `Badge`, `Skeleton`).
- Produces: `computeTrend(current: number, previous: number): { direction: "up" | "down" | "neutral" | "new"; pct: number | null }` de `@/lib/revenue-trend`; componente `RevenueStatCard` de `@/components/admin/RevenueStatCard`, props `{ label: string; value: string; current: number; previous: number; loading?: boolean; valueTestId?: string; trendTestId?: string; valueClassName?: string }` — usado pela Task 6.

- [ ] **Step 1: Criar `src/lib/revenue-trend.ts`**

```ts
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
```

- [ ] **Step 2: Verificar a lógica manualmente**

```bash
node -e '
function computeTrend(current, previous) {
  if (previous === 0) {
    if (current === 0) return { direction: "neutral", pct: 0 };
    return { direction: "new", pct: null };
  }
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return { direction: "up", pct };
  if (pct < 0) return { direction: "down", pct };
  return { direction: "neutral", pct: 0 };
}
console.log(computeTrend(150, 100));
console.log(computeTrend(50, 100));
console.log(computeTrend(100, 100));
console.log(computeTrend(10, 0));
console.log(computeTrend(0, 0));
'
```
Expected saída (nessa ordem): `{ direction: 'up', pct: 50 }`, `{ direction: 'down', pct: -50 }`, `{ direction: 'neutral', pct: 0 }`, `{ direction: 'new', pct: null }`, `{ direction: 'neutral', pct: 0 }`. Confirma que o TypeScript em `src/lib/revenue-trend.ts` implementa exatamente essa lógica (o mesmo corpo de função).

- [ ] **Step 3: Criar `src/components/admin/RevenueStatCard.tsx`**

```tsx
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
      : `${trend.pct !== null && trend.pct > 0 ? "+" : ""}${(trend.pct ?? 0).toFixed(1)}%`

  const Icon = trend.direction === "down" ? TrendingDown : trend.direction === "neutral" ? Minus : TrendingUp

  const badgeToneClass =
    trend.direction === "down"
      ? "border-red-200 bg-red-50 text-red-600"
      : trend.direction === "neutral"
        ? "border-gray-200 bg-gray-50 text-gray-500"
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
```

- [ ] **Step 4: Rodar o build para confirmar que compila**

```bash
npm run build
```
Expected: build conclui sem erros de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/lib/revenue-trend.ts src/components/admin/RevenueStatCard.tsx
git commit -m "feat(faturamento): componente de card com badge de tendência"
```

---

### Task 4: Reescrever `RevenueChart` (area chart com gradiente)

**Files:**
- Modify: `src/components/admin/RevenueChart.tsx`

**Interfaces:**
- Consumes: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartConfig` de `@/components/ui/chart` (Task 1); `Skeleton` de `@/components/ui/skeleton`.
- Produces: `RevenueChart({ data, loading }: { data: RevenueDayPoint[]; loading?: boolean })` (mesma assinatura de antes); `formatDayLabel(dateStr: string): string` agora exportado — consumido pela Task 6.

- [ ] **Step 1: Substituir o conteúdo de `src/components/admin/RevenueChart.tsx`**

```tsx
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
```

- [ ] **Step 2: Rodar o build para confirmar que compila**

```bash
npm run build
```
Expected: build conclui sem erros de TypeScript. `RevenueDashboardModal.tsx` ainda importa `RevenueChart` com a mesma assinatura de props, então nada quebra na composição existente.

- [ ] **Step 3: Rodar o e2e original (o gráfico antigo de 2 linhas vira área de 1 métrica, mas o `data-testid="revenue-chart"` continua igual)**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "abre popup"
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/RevenueChart.tsx
git commit -m "feat(faturamento): gráfico de faturamento vira area chart com gradiente"
```

---

### Task 5: Componente `DateRangePicker` (Popover + Calendar range)

**Files:**
- Create: `src/components/admin/DateRangePicker.tsx`

**Interfaces:**
- Consumes: `Calendar` de `@/components/ui/calendar` (Task 1); `Popover`, `PopoverTrigger`, `PopoverContent` de `@/components/ui/popover`; `Button` de `@/components/ui/button`.
- Produces: `DateRangePicker({ from, to, onChange }: { from: string; to: string; onChange: (range: { from: string; to: string }) => void })` — `from`/`to` no formato `"YYYY-MM-DD"` ou `""` — usado pela Task 6.

- [ ] **Step 1: Criar `src/components/admin/DateRangePicker.tsx`**

```tsx
"use client"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const selected: DateRange | undefined = from
    ? { from: parseLocalDate(from), to: to ? parseLocalDate(to) : undefined }
    : undefined

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ? toDayKey(range.from) : "",
      to: range?.to ? toDayKey(range.to) : "",
    })
    if (range?.from && range?.to) setOpen(false)
  }

  const label =
    selected?.from && selected?.to
      ? `${formatDisplay(selected.from)} – ${formatDisplay(selected.to)}`
      : "Selecionar período"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-testid="date-range-trigger"
          className={cn(
            "justify-start text-left font-normal text-sm gap-2 font-ui h-9",
            !selected?.from && "text-gray-400"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" data-testid="date-range-calendar">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={1}
          locale={ptBR}
          disabled={{ after: new Date() }}
          className="rounded-md"
        />
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Rodar o build para confirmar que compila**

```bash
npm run build
```
Expected: build conclui sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/DateRangePicker.tsx
git commit -m "feat(faturamento): seletor de intervalo de datas com calendário"
```

---

### Task 6: Reescrever `RevenueDashboardModal` (composição + responsividade)

**Files:**
- Modify: `src/components/admin/RevenueDashboardModal.tsx`

**Interfaces:**
- Consumes: `RevenueStatCard` (Task 3), `RevenueChart` + `formatDayLabel` (Task 4), `DateRangePicker` (Task 5), `RevenueSummary` (Task 2).
- Produces: `RevenueDashboardModal({ open, onClose }: { open: boolean; onClose: () => void })` — mesma assinatura de props já usada por `AdminHero.tsx`, nenhuma mudança lá.

- [ ] **Step 1: Substituir o conteúdo de `src/components/admin/RevenueDashboardModal.tsx`**

```tsx
"use client"
import { useEffect, useMemo, useState } from "react"
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
          <DialogTitle className="text-xl font-black font-display">Faturamento</DialogTitle>
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
              <RevenueChart data={summary?.series ?? []} loading={loading} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Rodar o build**

```bash
npm run build
```
Expected: build conclui sem erros de TypeScript.

- [ ] **Step 3: Rodar o e2e original**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "abre popup"
```
Expected: PASS — heading "Faturamento", pills "Hoje"/"7 dias" com `aria-pressed`, `data-testid="revenue-chart"` e `data-testid="stat-total-orders"` continuam se comportando como antes.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/RevenueDashboardModal.tsx
git commit -m "feat(faturamento): compõe modal redesenhado com stat cards, area chart e seletor de datas"
```

---

### Task 7: Teste e2e do filtro personalizado + validação mobile

**Files:**
- Modify: `e2e/admin-revenue-dashboard.spec.ts`

**Interfaces:**
- Nenhuma nova interface — só cobertura de teste sobre o que as Tasks 2–6 produziram.

- [ ] **Step 1: Adicionar teste do filtro personalizado com calendário**

No mesmo `test.describe` de `e2e/admin-revenue-dashboard.spec.ts`, adicionar:

```ts
  test("filtro personalizado seleciona intervalo pelo calendário", async ({ page, request }) => {
    await createTestOrder(request, `Pedido Custom E2E ${testRunId}`)
    await loginAdmin(page)

    await page.getByRole("button", { name: "Ver dashboard de faturamento" }).click()
    await expect(page.getByRole("heading", { name: "Faturamento" })).toBeVisible()

    await page.getByRole("button", { name: "Personalizado", exact: true }).click()
    await expect(page.getByTestId("date-range-trigger")).toBeVisible()

    await page.getByTestId("date-range-trigger").click()
    const calendarPanel = page.getByTestId("date-range-calendar")
    await expect(calendarPanel).toBeVisible()

    const day = String(new Date().getDate())
    const dayButton = calendarPanel.getByRole("button").filter({ hasText: new RegExp(`^${day}$`) })
    await expect(dayButton).toBeVisible()

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/dashboard/revenue") && res.url().includes("from=")
    )
    await dayButton.click()
    await dayButton.click()
    await responsePromise

    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible({ timeout: 5000 })
  })
```

- [ ] **Step 2: Rodar o teste novo e ajustar seletor se necessário**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "filtro personalizado"
```
Expected: PASS. Se o locator `dayButton` não encontrar exatamente 1 elemento (erro de "strict mode violation" ou "0 elements"), rode com `--debug` (`npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "filtro personalizado" --debug`), inspecione o markup real do dia no calendário aberto e ajuste o filtro do locator para bater com o texto/atributo renderizado — sem mudar o componente `DateRangePicker` em si, só o seletor do teste.

- [ ] **Step 3: Adicionar teste de responsividade mobile (375px)**

```ts
  test("popup de faturamento não gera overflow horizontal em mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAdmin(page)

    await page.getByRole("button", { name: "Ver dashboard de faturamento" }).click()
    await expect(page.getByRole("heading", { name: "Faturamento" })).toBeVisible()
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible({ timeout: 5000 })

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    )
    expect(hasHorizontalOverflow).toBe(false)
  })
```

- [ ] **Step 4: Rodar o teste de mobile**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts -g "overflow horizontal"
```
Expected: PASS. Se falhar, o problema está em algum elemento sem `flex-wrap`/`min-w-0` na árvore do modal — ajustar a classe do elemento responsável (mais provável: o `DateRangePicker` com `numberOfMonths` maior que 1, ou a linha de pills sem `flex-wrap`) em `RevenueDashboardModal.tsx` ou `DateRangePicker.tsx`, não introduzir um componente novo pra isso.

- [ ] **Step 5: Rodar a suite inteira do arquivo pra garantir que nada regrediu**

```bash
npx playwright test e2e/admin-revenue-dashboard.spec.ts
```
Expected: todos os testes do arquivo (o original + os 3 novos desta feature) PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/admin-revenue-dashboard.spec.ts
git commit -m "test(faturamento): cobre filtro personalizado por calendário e responsividade mobile"
```
