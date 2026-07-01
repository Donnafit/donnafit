"use client"
import { useState } from "react"
import { Printer, Check } from "lucide-react"
import type { OrderWithItems } from "@/types"

interface Props {
  order: OrderWithItems
}

function buildReceiptHTML(order: OrderWithItems): string {
  const date = new Date(order.created_at)
  const dateStr = date.toLocaleDateString("pt-BR")
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const itemsRows = order.order_items.map((item) => {
    const total = (item.unit_price * item.quantity).toFixed(2).replace(".", ",")
    const name = item.product_name.length > 22
      ? item.product_name.slice(0, 22) + "…"
      : item.product_name
    return `
      <tr>
        <td>${item.quantity}x ${name}</td>
        <td style="text-align:right">R$ ${total}</td>
      </tr>`
  }).join("")

  const total = Number(order.total).toFixed(2).replace(".", ",")
  const payment = order.payment_method === "pix" ? "PIX" : "Cartão / Maquininha"
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
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      width: 72mm;
      color: #000;
    }
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: bold; }
    .sep     { border-top: 1px dashed #000; margin: 5px 0; }
    .logo    { font-size: 14pt; font-weight: bold; letter-spacing: 2px; }
    .sub     { font-size: 8pt; margin-top: 1px; }
    table    { width: 100%; border-collapse: collapse; }
    td       { padding: 1px 0; font-size: 9pt; vertical-align: top; }
    .label   { font-size: 8pt; color: #555; }
    .total-row td { font-size: 12pt; font-weight: bold; padding-top: 4px; }
    .footer  { font-size: 8pt; margin-top: 8px; }
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

  function handlePrint() {
    const html = buildReceiptHTML(order)
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
        cursor: "pointer",
        transition: "all 200ms",
        width: "100%",
        justifyContent: "center",
      }}
    >
      {printed
        ? <Check size={13} strokeWidth={2} />
        : <Printer size={13} strokeWidth={1.8} />
      }
      {printed ? "Enviado para impressora!" : "Imprimir recibo"}
    </button>
  )
}
