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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const componentIds = [...new Set(comboRows.map((row: any) => row.component_product_id))]
    const { data: componentProducts } = await supabase
      .from("products")
      .select("id, name")
      .in("id", componentIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nameById = new Map((componentProducts ?? []).map((p: any) => [p.id, p.name]))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of comboRows as any[]) {
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
