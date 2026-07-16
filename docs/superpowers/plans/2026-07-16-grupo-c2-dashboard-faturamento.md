# Dashboard de Faturamento (Popup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um popup de dashboard de faturamento acessível a partir do tile "Faturamento" no `AdminHero`, com filtros de período (Hoje / 7 dias / 30 dias / Personalizado), totais agregados (pedidos, marmitas vendidas, faturamento) e um gráfico com 2 séries (faturamento por dia e quantidade de pedidos por dia).

**Architecture:** Uma nova API route (`GET /api/dashboard/revenue`) faz um único `select` em `orders` (com `order_items(quantity)` aninhado) no intervalo de datas pedido, exclui pedidos `cancelled` (mesma convenção já usada em `useRealtimeOrders`) e agrega por dia em JS (zero-fill dos dias sem pedido). O tile "Faturamento" em `AdminHero.tsx` ganha `onClick` e abre um novo componente `RevenueDashboardModal` (mesmo padrão `Dialog` de `OrderModal.tsx`), que gerencia o filtro de período como estado local, monta `from`/`to` (query params `YYYY-MM-DD`) e busca a API via `fetch`. O gráfico é um componente isolado `RevenueChart` usando `recharts` (`ComposedChart` com 2 eixos Y, um para R$ e outro para contagem de pedidos), consumindo exatamente o shape `RevenueDayPoint[]` retornado pela API.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Recharts (nova dependência), Playwright (e2e)

## Global Constraints

- Não introduzir websocket/real-time no popup — cada troca de filtro dispara um novo `fetch` único (sem polling, sem Supabase Realtime).
- Agregação por dia é feita em **JS**, após um único `select` de `orders` com `order_items(quantity)` aninhado (loja pequena/média, volume aceita essa abordagem — sem RPC/SQL agregando no banco).
- Pedidos com `status = 'cancelled'` são **excluídos** de todos os totais e do gráfico — mesma convenção já usada em `src/hooks/useRealtimeOrders.ts` (`.not("status", "eq", "cancelled")`) e implicitamente em `todayRevenue` da página de pedidos.
- **Decisão de filtro:** o período selecionado (Hoje/7 dias/30 dias/Personalizado) é estado **client-side** dentro do `RevenueDashboardModal`; a cada mudança de filtro o componente calcula `from`/`to` (strings `YYYY-MM-DD`, dia local) e os envia como **query params** para a API route. A API não guarda nenhum estado de filtro — ela é pura função de `from`/`to`.
- Seguir o padrão de modal já existente no projeto: `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` de `src/components/ui/dialog.tsx`, exatamente como `src/components/admin/OrderModal.tsx` faz.
- `recharts` é uma dependência nova — adicionar via `npm install recharts` (sem instalar `@types/recharts`, a lib já inclui tipos próprios).
- Sem lib de datas nova (`date-fns`, `dayjs` etc.) — usar `Date` nativo com getters locais (`getFullYear`/`getMonth`/`getDate`), do mesmo jeito que `AdminHero.tsx`/`pedidos/page.tsx` já fazem para "hoje" (limitação conhecida e pré-existente: dia calculado no timezone do servidor, não fixado explicitamente em `America/Sao_Paulo` — fora de escopo corrigir aqui).
- Não alterar `src/hooks/useRealtimeOrders.ts`, `OrderModal.tsx`, tipos de `Order`/`OrderItem` existentes, nem a lógica de `todayRevenue` em `pedidos/page.tsx`.
- Não deletar nenhum arquivo existente.

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `src/types/index.ts` | Modificar — adicionar `RevenueDayPoint` e `RevenueSummary` |
| `src/app/api/dashboard/revenue/route.ts` | **Criar** — API route de agregação |
| `package.json` / `package-lock.json` | Modificar — adicionar `recharts` |
| `src/components/admin/RevenueChart.tsx` | **Criar** — gráfico de 2 séries |
| `src/components/admin/RevenueDashboardModal.tsx` | **Criar** — popup com filtros + totais + gráfico |
| `src/components/admin/AdminHero.tsx` | Modificar — tile "Faturamento" clicável, abre o modal |
| `e2e/admin-revenue-dashboard.spec.ts` | **Criar** — teste e2e |

---

## Task 1: Shape de dados compartilhado (`RevenueDayPoint` / `RevenueSummary`)

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produz: os tipos `RevenueDayPoint` e `RevenueSummary`, usados **exatamente com estes nomes de campo** pela API route (Task 2), pelo `RevenueChart` (Task 3) e pelo `RevenueDashboardModal` (Task 4):
  ```ts
  interface RevenueDayPoint {
    date: string      // "YYYY-MM-DD", dia local, ordem ascendente, um item por dia do intervalo (zero-fill)
    revenue: number   // soma de orders.total (excluindo cancelled) criados nesse dia
    orders: number    // quantidade de pedidos (excluindo cancelled) criados nesse dia
  }

  interface RevenueSummary {
    totalOrders: number   // soma de RevenueDayPoint.orders no período
    totalItems: number    // soma de order_items.quantity de todos os pedidos do período
    totalRevenue: number  // soma de RevenueDayPoint.revenue no período
    series: RevenueDayPoint[]
  }
  ```

- [ ] **Step 1: Adicionar os tipos em `src/types/index.ts`**

  Adicionar ao final do arquivo (mantendo tudo que já existe):

  ```ts
  // Dashboard de faturamento — shape retornado por GET /api/dashboard/revenue
  // e consumido por RevenueDashboardModal / RevenueChart.
  export interface RevenueDayPoint {
    date: string
    revenue: number
    orders: number
  }

  export interface RevenueSummary {
    totalOrders: number
    totalItems: number
    totalRevenue: number
    series: RevenueDayPoint[]
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/types/index.ts
  git commit -m "types: adiciona RevenueDayPoint e RevenueSummary para o dashboard de faturamento"
  ```

---

## Task 2: API route de agregação — `GET /api/dashboard/revenue`

**Files:**
- Create: `src/app/api/dashboard/revenue/route.ts`

**Interfaces:**
- Consome: query params `from` e `to` (strings `YYYY-MM-DD`, inclusive, dia local), tabela `orders` (`id`, `total`, `created_at`, `status`) e `order_items` (`quantity`, `order_id`) via Supabase.
- Produz: `RevenueSummary` (Task 1) como JSON, status 200. Erros: 401 se não autenticado como staff, 400 se `from`/`to` ausentes/inválidos/invertidos/intervalo maior que 366 dias, 500 em erro de query.

- [ ] **Step 1: Criar a API route**

  ```ts
  // src/app/api/dashboard/revenue/route.ts
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { data, error } = await supabase
      .from("orders")
      .select("id, total, created_at, order_items(quantity)")
      .not("status", "eq", "cancelled")
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", rangeEnd.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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

    const response: RevenueSummary = { totalOrders, totalItems, totalRevenue, series }
    return NextResponse.json(response)
  }
  ```

- [ ] **Step 2: Verificar manualmente (build + smoke test local)**

  ```bash
  npm run build
  ```

  Confirmar que a rota compila sem erros de tipo (usa os tipos de `src/types/index.ts` criados na Task 1).

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/api/dashboard/revenue/route.ts
  git commit -m "feat: adiciona API route de agregação de faturamento por dia"
  ```

---

## Task 3: Instalar `recharts` + componente `RevenueChart`

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Create: `src/components/admin/RevenueChart.tsx`

**Interfaces:**
- Consome: `RevenueDayPoint[]` (Task 1) via prop `data`.
- Produz: componente `<RevenueChart data={...} loading={...} />` sem estado próprio de fetch — puramente de apresentação.

- [ ] **Step 1: Instalar a dependência**

  ```bash
  npm install recharts
  ```

- [ ] **Step 2: Criar o componente do gráfico**

  ```tsx
  // src/components/admin/RevenueChart.tsx
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
              formatter={(value: number, name: string) =>
                name === "Faturamento" ? [formatCurrency(value), name] : [value, name]
              }
              labelFormatter={(label: string) => formatDayLabel(label)}
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
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add package.json package-lock.json src/components/admin/RevenueChart.tsx
  git commit -m "feat: adiciona recharts e componente RevenueChart de 2 séries"
  ```

---

## Task 4: Popup `RevenueDashboardModal` (filtros + totais + gráfico)

**Files:**
- Create: `src/components/admin/RevenueDashboardModal.tsx`

**Interfaces:**
- Consome: `GET /api/dashboard/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD` (Task 2), resposta tipada como `RevenueSummary` (Task 1); consome `RevenueChart` (Task 3).
- Produz: componente `<RevenueDashboardModal open={boolean} onClose={() => void} />`, mesmo padrão de props de controle que `OrderModal` (`order`/`onClose`) — aqui adaptado pra `open`/`onClose` porque não há uma entidade selecionada, só um flag de visibilidade.

- [ ] **Step 1: Criar o componente do popup**

  ```tsx
  // src/components/admin/RevenueDashboardModal.tsx
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
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/admin/RevenueDashboardModal.tsx
  git commit -m "feat: adiciona popup de dashboard de faturamento com filtros de período"
  ```

---

## Task 5: Ligar o clique no tile "Faturamento" do `AdminHero`

**Files:**
- Modify: `src/components/admin/AdminHero.tsx`

**Interfaces:**
- Consome: `RevenueDashboardModal` (Task 4).
- Produz: tile "Faturamento" clicável (`role="button"`, `aria-label="Ver dashboard de faturamento"`, `tabIndex=0`, `onClick`/`onKeyDown`), abrindo o popup; os outros 3 tiles (Pendentes/Em Separação/Liberados) permanecem exatamente como estão, sem interação.

- [ ] **Step 1: Importar o modal e adicionar estado local**

  Em `src/components/admin/AdminHero.tsx`, adicionar o import logo abaixo do import de `ProfileModal`:

  ```tsx
  import { ProfileModal } from "./ProfileModal"
  import { RevenueDashboardModal } from "./RevenueDashboardModal"
  ```

  Dentro do componente, junto aos outros `useState` já existentes (`showProfile`, `profileName`, `profilePhoto`), adicionar:

  ```tsx
  const [showRevenueDashboard, setShowRevenueDashboard] = useState(false)
  ```

- [ ] **Step 2: Tornar o tile "Faturamento" clicável**

  No bloco `{stats.map((stat, i) => ( ... ))}`, trocar a abertura da `<div>` de cada stat (que hoje é sempre estática) para calcular se é o tile de faturamento e ligar o clique só nele:

  ```tsx
  {stats.map((stat, i) => {
    const isRevenueTile = stat.label === "Faturamento"
    return (
      <div
        key={i}
        className={i < 2 ? "admin-hero-stat-fade" : undefined}
        role={isRevenueTile ? "button" : undefined}
        tabIndex={isRevenueTile ? 0 : undefined}
        aria-label={isRevenueTile ? "Ver dashboard de faturamento" : undefined}
        onClick={isRevenueTile ? () => setShowRevenueDashboard(true) : undefined}
        onKeyDown={
          isRevenueTile
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setShowRevenueDashboard(true)
                }
              }
            : undefined
        }
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderBottom: "none",
          borderRadius: "12px 12px 0 0",
          padding: "14px 18px 16px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 6px 10px -4px rgba(0,0,0,0.35)",
          cursor: isRevenueTile ? "pointer" : "default",
        }}
      >
  ```

  (o restante do conteúdo interno da `<div>` — ícone, label, valor, sub-label — permanece exatamente igual ao que já existe hoje; só o fechamento `</div>` e `)` do `.map` precisam se ajustar pra fechar o novo `return`).

- [ ] **Step 3: Renderizar o popup**

  Logo após o bloco `{showProfile && (<ProfileModal ... />)}`, no final do JSX retornado (ainda dentro do fragment `<>...</>`), adicionar:

  ```tsx
  <RevenueDashboardModal
    open={showRevenueDashboard}
    onClose={() => setShowRevenueDashboard(false)}
  />
  ```

- [ ] **Step 4: Verificar visualmente**

  ```bash
  npm run dev
  ```

  Acessar `/admin/pedidos`, clicar no tile "Faturamento" e confirmar que o popup abre com o filtro "Hoje" já selecionado e os totais carregando.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/admin/AdminHero.tsx
  git commit -m "feat: liga o tile Faturamento ao popup de dashboard"
  ```

---

## Task 6: Teste e2e

**Files:**
- Create: `e2e/admin-revenue-dashboard.spec.ts`
- Test: `npx playwright test e2e/admin-revenue-dashboard.spec.ts --project=chromium`

**Interfaces:**
- Consome: fixtures de `e2e/fixtures.ts` (`loadFixtures`, `resetProductStock`), API `/api/orders` (para criar um pedido de teste) e a UI produzida nas Tasks 4/5 (`aria-label="Ver dashboard de faturamento"`, botões de filtro por texto, `data-testid="stat-total-orders"`, `data-testid="revenue-chart"`).

- [ ] **Step 1: Criar o spec**

  ```ts
  // e2e/admin-revenue-dashboard.spec.ts
  import { test, expect } from "@playwright/test"
  import { loadFixtures, resetProductStock } from "./fixtures"

  const fx = loadFixtures()

  // Sufixo novo a cada execução — evita colisão com pedidos de execuções
  // anteriores da mesma suite (mesmo padrão de admin-pedidos.spec.ts).
  const testRunId = `${fx.runTag}-${Math.random().toString(36).slice(2, 8)}`

  test.beforeAll(async () => {
    await resetProductStock(fx.product.id)
  })

  async function loginAdmin(page: import("@playwright/test").Page) {
    await page.goto("/acessoadmin")
    await page.getByPlaceholder("seu@email.com").fill(fx.admin.email)
    await page.getByPlaceholder("••••••••").fill(fx.admin.password)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 10_000 })
  }

  async function createTestOrder(request: import("@playwright/test").APIRequestContext, customerName: string) {
    const res = await request.post("/api/orders", {
      data: {
        customerName,
        customerPhone: `4199999${Math.floor(Math.random() * 9000 + 1000)}`,
        deliveryType: "pickup",
        paymentMethod: "card",
        items: [{
          product: {
            id: fx.product.id, name: fx.product.name, sku: `E2E-TEST-${fx.runTag}`,
            price: fx.product.price, stock_type: "avulso", category_id: null,
          },
          quantity: 2,
        }],
        total: fx.product.price * 2,
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    return res.json()
  }

  test.describe("Admin — Dashboard de Faturamento", () => {
    test("abre popup ao clicar no tile Faturamento, mostra totais e atualiza ao trocar filtro", async ({ page, request }) => {
      const customerName = `Pedido Faturamento E2E ${testRunId}`
      await createTestOrder(request, customerName)

      await loginAdmin(page)

      // Abre o popup pelo tile
      await page.getByRole("button", { name: "Ver dashboard de faturamento" }).click()
      await expect(page.getByRole("heading", { name: "Faturamento" })).toBeVisible()

      // Filtro "Hoje" ativo por padrão
      await expect(page.getByRole("button", { name: "Hoje", exact: true })).toHaveAttribute("aria-pressed", "true")

      // Espera o primeiro fetch resolver e o gráfico renderizar
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible({ timeout: 5000 })

      const totalOrdersHoje = Number(
        await page.locator('[data-testid="stat-total-orders"]').innerText()
      )
      // O pedido de teste foi criado agora — deve contar no filtro "Hoje".
      expect(totalOrdersHoje).toBeGreaterThanOrEqual(1)

      // Troca pra "7 dias" — dispara um novo fetch com from/to diferentes.
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes("/api/dashboard/revenue") && res.url().includes("from=")
      )
      await page.getByRole("button", { name: "7 dias", exact: true }).click()
      const response = await responsePromise
      expect(response.ok()).toBeTruthy()

      await expect(page.getByRole("button", { name: "7 dias", exact: true })).toHaveAttribute("aria-pressed", "true")
      await expect(page.getByRole("button", { name: "Hoje", exact: true })).toHaveAttribute("aria-pressed", "false")

      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible({ timeout: 5000 })

      const totalOrders7d = Number(
        await page.locator('[data-testid="stat-total-orders"]').innerText()
      )
      // "7 dias" é um superconjunto de "Hoje" — o total nunca pode ser menor.
      expect(totalOrders7d).toBeGreaterThanOrEqual(totalOrdersHoje)
    })
  })
  ```

- [ ] **Step 2: Rodar o teste**

  ```bash
  npx playwright test e2e/admin-revenue-dashboard.spec.ts --project=chromium
  ```

  Confirmar que passa. Se falhar por timing do primeiro fetch, aumentar o timeout do `expect` do gráfico — não adicionar `waitForTimeout` fixo sem necessidade.

- [ ] **Step 3: Commit**

  ```bash
  git add e2e/admin-revenue-dashboard.spec.ts
  git commit -m "test: adiciona e2e do popup de dashboard de faturamento"
  ```

---

### Critical Files for Implementation
- src/app/api/dashboard/revenue/route.ts
- src/components/admin/RevenueDashboardModal.tsx
- src/components/admin/RevenueChart.tsx
- src/components/admin/AdminHero.tsx
- src/types/index.ts
