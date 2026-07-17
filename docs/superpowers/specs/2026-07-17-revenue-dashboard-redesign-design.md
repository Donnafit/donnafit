# Redesign do popup de Faturamento (RevenueDashboardModal)

## Contexto

O popup de faturamento já existe e funciona: abre ao clicar no tile "Faturamento" do `AdminHero.tsx`, mostra filtro de período (Hoje/7 dias/30 dias/Personalizado), 3 cards de totais (pedidos, marmitas, faturamento) e um gráfico de linhas duplo-eixo (faturamento + pedidos).

Este spec cobre um **redesign visual e de organização** desse popup, usando o bloco `dashboard-01` do shadcn/ui como referência de padrão (cards de KPI com badge de tendência, area chart com gradiente), mantendo a paleta e tipografia já definidas no projeto (dourado `#C89B3C`/`#A67D2A`, verde `#5A6B2A`/`#3D4A1C`, fontes `font-display`/`font-body`/`font-ui`). Não é uma feature nova — é elevar o acabamento do que já existe.

Escopo: `RevenueDashboardModal.tsx`, `RevenueChart.tsx`, novos subcomponentes, e a API `/api/dashboard/revenue`. **Fora do escopo**: o tile "Faturamento" do `AdminHero.tsx` (só o gatilho que abre o modal, não muda).

## Componentes

- **`RevenueDashboardModal.tsx`** (reescrito) — mantém `Dialog`/`DialogContent` (`rounded-3xl`, pode crescer para `max-w-3xl` se necessário para respiro dos cards), orquestra estado de período/filtro e composição dos subcomponentes abaixo.
- **`RevenueStatCard.tsx`** (novo) — um card por KPI (Total de pedidos, Marmitas vendidas, Faturamento total). Estrutura: `CardDescription` (rótulo), `CardTitle` grande (valor formatado), badge de tendência no canto (↑/↓ % vs período anterior equivalente, ou "Novo" quando o período anterior for zero e o atual positivo, ou badge neutro "0%" quando ambos forem zero), rodapé com texto contextual curto ("Alta esse período" / "Queda esse período" + ícone `TrendingUp`/`TrendingDown`).
- **`RevenueChart.tsx`** (reescrito) — troca o `ComposedChart` de linhas duplo-eixo por um `AreaChart` de uma métrica só (faturamento), gradiente dourado, usando o wrapper `chart.tsx` do shadcn (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`) — componente ainda não instalado no projeto, precisa `npx shadcn add chart`. Pedidos deixa de aparecer no gráfico (permanece só no card).
- **`DateRangePicker.tsx`** (novo) — `Popover` + `Calendar` (modo `range`) do shadcn, usado apenas quando período = "Personalizado", substituindo os dois `<input type="date">` nativos atuais. Componente `calendar` ainda não instalado, precisa `npx shadcn add calendar`.
- Estados de carregamento usam `Skeleton` (já existe em `components/ui/skeleton.tsx`) no lugar dos atuais textos "…" / "Carregando gráfico…".

Cada subcomponente novo deve ser entendível isoladamente: `RevenueStatCard` recebe `label`, `value`, `previousValue` (ou já um `trend` calculado) via props e não sabe nada sobre period/filtro; `DateRangePicker` recebe `value`/`onChange` de um range e não sabe nada sobre a API.

## Dados / API

`GET /api/dashboard/revenue?from=&to=` (`src/app/api/dashboard/revenue/route.ts`) passa a calcular também o período anterior equivalente:

- Duração do período pedido = `rangeDays` (já calculado hoje).
- Período anterior: termina no dia imediatamente antes de `from`, com a mesma duração (`rangeDays` dias).
- Roda a mesma agregação (excluindo `status = cancelled`) para o período anterior, mas só precisa dos totais agregados — não gera `series` diária pra ele (não é usado no gráfico).

`RevenueSummary` (em `src/types/index.ts`) ganha um campo novo:

```ts
previousPeriod: {
  totalOrders: number
  totalItems: number
  totalRevenue: number
}
```

Cálculo de tendência (front, em `RevenueStatCard` ou num helper compartilhado):
- `previous === 0 && current > 0` → badge "Novo" (cor dourada, ícone de alta, sem percentual).
- `previous === 0 && current === 0` → badge neutro "0%" (cinza, sem ícone de direção).
- Caso contrário → `pct = ((current - previous) / previous) * 100`, badge verde com `TrendingUp` se `pct > 0`, vermelho com `TrendingDown` se `pct < 0`, neutro se `pct === 0`.

## Visual / identidade

- Verde da marca para tendência de alta, vermelho (`red-600`, mesmo tom já usado no `errorMsg` do modal atual) para tendência de queda — não introduz uma nova cor semântica no projeto.
- Gradiente do `AreaChart` em dourado (`brand-gold` → transparente), linha/traço também dourado.
- Tipografia: números grandes dos cards em `font-display`, rótulos/textos auxiliares em `font-ui`/`font-body` — mesmos tokens já usados no restante do admin, nenhuma fonte nova.
- Pills de período (Hoje/7 dias/30 dias/Personalizado) mantêm o visual atual (`bg-brand-gold` quando ativo); só o modo "Personalizado" troca os inputs nativos pelo `DateRangePicker`.
- **Responsividade**: o layout precisa se adaptar corretamente a telas menores (mobile/tablet) — grid de 3 stat cards colapsa para 1 coluna em telas estreitas, o `Popover` do `DateRangePicker` não deve estourar a viewport, e o gráfico deve permanecer legível (sem overflow horizontal) dentro do `max-h-[90vh] overflow-y-auto` do `DialogContent`. Essa responsividade deve ser tratada com atenção explícita durante a implementação (delegar ao `frontend-agent` com esse requisito nomeado).

## Erros e estados vazios

Mantém o comportamento atual: mensagem de erro (`errorMsg`) em vermelho quando o fetch falha; mensagem "Selecione as duas datas para ver os dados" quando "Personalizado" está sem range completo; "Sem dados para o período selecionado" quando a série vem vazia. Esses textos/condicionais são preservados, só o estilo ao redor muda.

## Testes

- `e2e/admin-revenue-dashboard.spec.ts` depende de: heading "Faturamento", botão "Ver dashboard de faturamento" (no `AdminHero`, fora de escopo), pills "Hoje"/"7 dias" com `aria-pressed`, `data-testid="revenue-chart"`, `data-testid="stat-total-orders"` contendo **apenas o número** (o teste faz `Number(innerText)`). Esses seletores/testids devem ser preservados exatamente — o badge de tendência e qualquer texto novo do card não podem entrar dentro do elemento com `data-testid="stat-total-orders"`.
- Rodar esse e2e ao final da implementação para confirmar que nada quebrou.
- Não é necessário novo teste e2e específico para os badges de tendência (cobertura visual, não crítica de negócio), mas a lógica de cálculo de tendência (helper de %) é uma boa candidata a teste unitário simples (casos: normal, previous=0/current>0, ambos=0).

## Decisões confirmadas com o usuário

- Badges de tendência (% vs período anterior) nos 3 cards: **sim**.
- Gráfico: area chart só de faturamento (não duplo-eixo com pedidos): **sim**.
- Filtro personalizado com `Calendar`+`Popover` do shadcn: **sim**.
- Estrutura em subcomponentes separados (não tudo dentro do modal): **sim**.
- Base de comparação de tendência = período anterior equivalente (mesma duração, imediatamente anterior): **sim**.
- Responsividade para telas menores é requisito explícito de implementação.
