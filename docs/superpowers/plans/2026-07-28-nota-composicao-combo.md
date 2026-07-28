# Composição de combo na nota impressa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na nota impressa do painel admin, cada item de combo do pedido passa a listar, indentado abaixo da linha do combo, os componentes (marmitas) que o compõem, com a quantidade já multiplicada pela quantidade de combos comprada.

**Architecture:** Toda a mudança fica em um único arquivo, `src/components/admin/FiscalCopyButton.tsx`. Ao clicar em "Imprimir recibo", o componente busca (client-side, via `createClient()` de `@/lib/supabase/client`) a composição dos combos presentes no pedido — join `combo_items` (composição fixa cadastrada no catálogo) → `products` (nome do componente) — e passa esse mapa para `buildReceiptHTML`, que gera sub-linhas HTML indentadas abaixo de cada linha de combo. Se a busca falhar ou o combo não tiver composição cadastrada, a nota imprime normalmente, sem as sub-linhas daquele combo.

**Tech Stack:** Next.js (client component, `"use client"`), Supabase JS client (`@supabase/ssr` `createBrowserClient`), TypeScript, `lucide-react` para ícones.

## Global Constraints

- Escopo restrito a `FiscalCopyButton.tsx` — não alterar `whatsapp.ts`, `OrderModal.tsx` nem `OrderDetailPanel.tsx` (spec: `docs/superpowers/specs/2026-07-28-nota-composicao-combo-design.md`).
- Quantidades dos componentes do combo são multiplicadas pela quantidade do item de combo no pedido (decisão já validada com o usuário).
- Layout: sub-linhas indentadas, fonte menor, sem preço — nunca em parênteses na mesma linha.
- Falha na busca de dados não pode bloquear a impressão: sempre cai no comportamento atual (linha única do combo, sem sub-linhas).
- Sem framework de teste unitário neste projeto (só Playwright e2e); verificação desta feature é manual, via `npm run dev` + navegador (é um componente que abre `window.open` + `window.print()`, fora do escopo prático de automação nesta rodada — conforme já acordado na spec).

---

### Task 1: Buscar e mesclar a composição do combo na nota impressa

**Files:**
- Modify: `src/components/admin/FiscalCopyButton.tsx` (todo o arquivo — 165 linhas atuais)

**Interfaces:**
- Consumes: `OrderWithItems` (de `@/types`) — já inclui `order_items: (OrderItem & { product: Product | null })[]`, então `item.product?.stock_type === "combo"` e `item.product_id` já estão disponíveis sem fetch adicional. `createClient` de `@/lib/supabase/client` (mesmo padrão usado em `src/components/checkout/CheckoutForm.tsx:195`).
- Produces: nenhuma outra parte do código consome este arquivo além do próprio botão renderizado em `OrderModal.tsx:121` e `OrderDetailPanel.tsx:289` — a assinatura pública do componente (`FiscalCopyButton({ order }: Props)`) não muda, então nenhum caller precisa ser tocado.

- [ ] **Step 1: Ler o arquivo atual para confirmar que nada mudou desde a exploração**

Já lido nesta sessão (`src/components/admin/FiscalCopyButton.tsx`, 165 linhas). Não precisa reler — só confirmar mentalmente a estrutura: `buildReceiptHTML(order)` (linhas 10-119) monta o HTML; `itemsRows` (linhas 15-25) monta as linhas de item; `FiscalCopyButton` (linhas 121-165) tem `handlePrint` síncrono.

- [ ] **Step 2: Reescrever o arquivo inteiro com a nova lógica**

Substituir todo o conteúdo de `src/components/admin/FiscalCopyButton.tsx` por:

```tsx
"use client"
import { useState } from "react"
import { Printer, Check, Loader2 } from "lucide-react"
import type { OrderWithItems } from "@/types"
import { createClient } from "@/lib/supabase/client"

interface Props {
  order: OrderWithItems
}

interface ComboComponent {
  name: string
  quantity: number
}

// Composição de cada combo é fixa por produto no catálogo (tabela combo_items,
// cadastrada em EstoqueClient.tsx) — não é escolhida pelo cliente por pedido.
// Por isso dá pra buscar aqui, no momento da impressão, sem precisar já ter
// sido salva junto com order_items.
async function fetchComboComposition(
  order: OrderWithItems
): Promise<Map<string, ComboComponent[]>> {
  const composition = new Map<string, ComboComponent[]>()

  const comboProductIds = [...new Set(
    order.order_items
      .filter((item) => item.product?.stock_type === "combo" && item.product_id)
      .map((item) => item.product_id as string)
  )]
  if (comboProductIds.length === 0) return composition

  try {
    const supabase = createClient()
    const { data: comboRows } = await supabase
      .from("combo_items")
      .select("combo_product_id, component_product_id, quantity")
      .in("combo_product_id", comboProductIds)
    if (!comboRows || comboRows.length === 0) return composition

    const componentIds = [...new Set(comboRows.map((row) => row.component_product_id))]
    const { data: componentProducts } = await supabase
      .from("products")
      .select("id, name")
      .in("id", componentIds)
    const nameById = new Map((componentProducts ?? []).map((p) => [p.id, p.name]))

    for (const row of comboRows) {
      const name = nameById.get(row.component_product_id)
      if (!name) continue
      const list = composition.get(row.combo_product_id) ?? []
      list.push({ name, quantity: row.quantity })
      composition.set(row.combo_product_id, list)
    }
  } catch {
    return new Map()
  }

  return composition
}

function buildReceiptHTML(
  order: OrderWithItems,
  comboComposition: Map<string, ComboComponent[]>
): string {
  const date = new Date(order.created_at)
  const dateStr = date.toLocaleDateString("pt-BR")
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const itemsRows = order.order_items.map((item) => {
    const total = (item.unit_price * item.quantity).toFixed(2).replace(".", ",")
    const name = item.product_name.length > 22
      ? item.product_name.slice(0, 22) + "…"
      : item.product_name

    const components = item.product_id ? comboComposition.get(item.product_id) : undefined
    const componentRows = components
      ? components.map((c) => `
      <tr>
        <td colspan="2" style="padding-left:10px;font-size:8.5pt;font-weight:500;">${c.quantity * item.quantity}x ${c.name}</td>
      </tr>`).join("")
      : ""

    return `
      <tr>
        <td>${item.quantity}x ${name}</td>
        <td style="text-align:right">R$ ${total}</td>
      </tr>${componentRows}`
  }).join("")

  const total = Number(order.total).toFixed(2).replace(".", ",")
  const payment = order.payment_method === "pix"
    ? "PIX"
    : order.payment_method === "card_link"
      ? "Cartão (link de pagamento)"
      : "Cartão / Maquininha"
  const delivery = order.delivery_type === "delivery" ? "Entrega" : "Retirada"

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Pedido #${order.order_number} — Donna FIT</title>
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: 600;
      width: 72mm;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: 800; }
    .sep     { border-top: 2px dashed #000; margin: 5px 0; }
    .logo    { font-size: 15pt; font-weight: 800; letter-spacing: 2px; }
    .sub     { font-size: 9pt; margin-top: 1px; font-weight: 600; }
    table    { width: 100%; border-collapse: collapse; }
    td       { padding: 1px 0; font-size: 10pt; font-weight: 600; vertical-align: top; }
    .label   { font-size: 9pt; color: #000; font-weight: 700; }
    .total-row td { font-size: 13pt; font-weight: 800; padding-top: 4px; }
    .footer  { font-size: 9pt; margin-top: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="center">
    <div class="logo">DONNA FIT</div>
    <div class="sub">Alimentação Saudável</div>
  </div>

  <div class="sep"></div>

  <table>
    <tr><td class="label">Pedido</td><td class="right">#${order.order_number}</td></tr>
    <tr><td class="label">Data</td><td class="right">${dateStr} ${timeStr}</td></tr>
    <tr><td class="label">Tipo</td><td class="right">${delivery}</td></tr>
    <tr><td class="label">Pagamento</td><td class="right">${payment}</td></tr>
  </table>

  <div class="sep"></div>

  <div class="label bold" style="margin-bottom:3px">CLIENTE</div>
  <div>${order.customer_name}</div>
  ${order.customer_phone ? `<div class="label">${order.customer_phone}</div>` : ""}
  ${order.delivery_type === "delivery" && order.delivery_address
    ? `<div class="label" style="margin-top:2px">${order.delivery_address}</div>`
    : ""}

  <div class="sep"></div>

  <div class="label bold" style="margin-bottom:3px">ITENS</div>
  <table>${itemsRows}</table>

  <div class="sep"></div>

  <table>
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="right">R$ ${total}</td>
    </tr>
  </table>

  ${order.notes?.trim() ? `
  <div class="sep"></div>
  <div class="label bold">OBSERVAÇÕES</div>
  <div style="font-size:9pt;margin-top:2px">${order.notes}</div>` : ""}

  <div class="sep"></div>
  <div class="center footer">Obrigado pela preferência!</div>

  <script>
    window.onload = function () {
      window.print()
      window.addEventListener("afterprint", function () { window.close() })
    }
  <\/script>
</body>
</html>`
}

export function FiscalCopyButton({ order }: Props) {
  const [printed, setPrinted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handlePrint() {
    setLoading(true)
    const comboComposition = await fetchComboComposition(order)
    setLoading(false)

    const html = buildReceiptHTML(order, comboComposition)
    const win = window.open("", "_blank", "width=400,height=600,toolbar=0,menubar=0,scrollbars=0")
    if (!win) {
      alert("Permita pop-ups para imprimir.")
      return
    }
    win.document.write(html)
    win.document.close()
    setPrinted(true)
    setTimeout(() => setPrinted(false), 3000)
  }

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: 600,
        padding: "8px 14px",
        borderRadius: 8,
        background: printed ? "rgba(52,211,153,0.10)" : "rgba(200,155,60,0.08)",
        border: `1px solid ${printed ? "rgba(52,211,153,0.3)" : "rgba(200,155,60,0.25)"}`,
        color: printed ? "#059669" : "var(--gold-500)",
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "all 200ms",
        width: "100%",
        justifyContent: "center",
      }}
    >
      {loading
        ? <Loader2 size={13} strokeWidth={2} className="animate-spin" />
        : printed
          ? <Check size={13} strokeWidth={2} />
          : <Printer size={13} strokeWidth={1.8} />
      }
      {loading ? "Preparando..." : printed ? "Enviado para impressora!" : "Imprimir recibo"}
    </button>
  )
}
```

Notas sobre o que mudou em relação ao original:
- `buildReceiptHTML` ganha um segundo parâmetro `comboComposition: Map<string, ComboComponent[]>`.
- Nova função `fetchComboComposition` faz o fetch (dois `select` encadeados, mesmo padrão de `CheckoutForm.tsx:195-227`) e nunca lança — qualquer erro cai no `catch` e retorna `Map` vazio, preservando o fallback descrito na spec.
- `itemsRows` agora gera `componentRows` por item quando `item.product_id` está no mapa de composição, multiplicando `c.quantity * item.quantity`.
- `handlePrint` vira `async`, com estado `loading` novo controlando o texto/ícone do botão e desabilitando o clique duplo durante o fetch.
- `className="animate-spin"` no `Loader2` segue o mesmo padrão já usado em `src/components/admin/DeliveryZonesModal.tsx:135`.

- [ ] **Step 3: Rodar o type-check**

Run: `cd "/home/ubuntu/Projetos/Donna FIT" && npx tsc --noEmit`
Expected: sem erros novos relacionados a `FiscalCopyButton.tsx` (o projeto pode já ter avisos pré-existentes em outros arquivos — só checar que nada aponta para este arquivo).

- [ ] **Step 4: Verificação manual — combo simples**

Com `npm run dev` rodando:
1. No admin (`/admin/pedidos`), abra um pedido existente que contenha um combo (ex.: "COMBO DE 10 SOPAS", id `2e9640d8-e743-4e5a-a491-0fed31dd3b26`, composição real: 2x Creme de milho com queijo mussarela, 2x CALDO VERDE, 2x Caldo De Kenga, 2x Creme De Abóbora Cabotiá, 2x Caldo de feijão) — ou crie um pedido de teste via checkout com esse produto.
2. Clique em "Imprimir recibo". O botão deve mostrar brevemente "Preparando..." com o ícone girando, depois abrir a janela de impressão.
3. Confirmar que a nota mostra a linha do combo (`1x COMBO DE 10 SOPAS — R$ 138,90`) seguida de 5 sub-linhas indentadas, fonte menor, sem preço, com as quantidades exatas do catálogo (já que é 1 unidade do combo, sem multiplicação visível).

Expected: sub-linhas aparecem corretamente, sem preço, indentadas.

- [ ] **Step 5: Verificação manual — combo com quantidade > 1**

1. Crie (ou edite via SQL/admin de estoque, se mais rápido) um pedido com 2 unidades do mesmo combo "COMBO DE 10 SOPAS".
2. Imprima o recibo.
3. Confirmar que cada sub-linha aparece com a quantidade dobrada (4x cada componente, já que 2 unidades × 2 de cada componente).

Expected: quantidades multiplicadas corretamente por `item.quantity`.

- [ ] **Step 6: Verificação manual — pedido sem combo (regressão)**

1. Abra um pedido só com itens avulsos (sem combo).
2. Imprima o recibo.
3. Confirmar que a nota é idêntica ao comportamento anterior — nenhuma sub-linha, nenhum atraso perceptível (o fetch nem dispara, já que `comboProductIds.length === 0`).

Expected: comportamento inalterado.

- [ ] **Step 7: Verificação manual — pedido com combo + itens avulsos misturados**

1. Crie um pedido com 1 combo e 1 item avulso.
2. Imprima o recibo.
3. Confirmar que só a linha do combo ganha sub-linhas; o item avulso aparece normal, sem sub-linhas.

Expected: sub-linhas só sob a linha do combo correspondente.

- [ ] **Step 8: Commit**

```bash
cd "/home/ubuntu/Projetos/Donna FIT"
git add src/components/admin/FiscalCopyButton.tsx
git commit -m "$(cat <<'EOF'
feat(admin): detalha composição do combo na nota impressa

Busca a composição fixa do catálogo (combo_items) no momento da
impressão e lista as marmitas do combo, indentadas e com quantidade
já multiplicada, abaixo da linha do combo na nota. WhatsApp e telas
de detalhe do pedido não mudam.
EOF
)"
```

---

## Self-Review

- **Cobertura da spec:** as 5 seções da spec (fluxo de dados, comportamento desejado, mudança de UX, fora de escopo, testes) estão todas endereçadas no Task 1 — não há necessidade de decompor em mais tarefas, é uma mudança de um único arquivo.
- **Placeholders:** nenhum "TBD"/"implementar depois" — o código completo do arquivo está no Step 2, pronto para colar.
- **Consistência de tipos:** `ComboComponent { name: string, quantity: number }` é o único tipo novo, usado de forma consistente em `fetchComboComposition` (produz `Map<string, ComboComponent[]>`) e `buildReceiptHTML` (consome o mesmo tipo). `Props` e a assinatura pública de `FiscalCopyButton` não mudam.
