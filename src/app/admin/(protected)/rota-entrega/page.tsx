"use client"
import { MapPin, Phone, Truck, Package, CheckCircle2 } from "lucide-react"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { formatCurrency } from "@/lib/utils"
import { getNextStep, getStatusPill } from "@/lib/orderStatus"
import type { OrderWithItems } from "@/types"

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

export default function RotaEntregaPage() {
  const { orders, loading, updateStatus } = useRealtimeOrders()

  const deliveries = orders.filter((o) => o.delivery_type === "delivery" && o.delivery_address)
  const active = deliveries.filter((o) => o.status === "ready" || o.status === "out_for_delivery")
  const done = deliveries.filter((o) => o.status === "delivered")

  const metrics = [
    { label: "Para entregar", value: active.length, Icon: Truck, accent: "var(--gold-500)", dim: "rgba(200,155,60,0.14)" },
    { label: "Entregues hoje", value: done.length, Icon: CheckCircle2, accent: "#10B981", dim: "rgba(16,185,129,0.1)" },
  ]

  async function handleAdvance(id: string, status: string) {
    try {
      await updateStatus(id, status)
    } catch (err) {
      console.error("Erro ao atualizar status da entrega:", err)
    }
  }

  if (loading) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-50)" }}>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-300)" }}>Carregando rota...</p>
      </div>
    )
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--surface-50)" }}>
      {/* Header */}
      <div
        className="px-4 sm:px-7"
        style={{
          background: "var(--surface-100)", borderBottom: "1px solid var(--surface-200)",
          paddingTop: 18, paddingBottom: 18,
          position: "sticky", top: 0, zIndex: 10,
        }}
      >
        <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 800, color: "var(--text-950)" }}>
          Rota de Entrega
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
          {active.length} para entregar · {done.length} entregue{done.length === 1 ? "" : "s"} hoje
        </p>
      </div>

      <div className="px-4 sm:px-7" style={{ paddingTop: 22, paddingBottom: 90 }}>
        {/* Métricas */}
        <div className="grid grid-cols-2" style={{ gap: 12, marginBottom: 24, maxWidth: 480 }}>
          {metrics.map(({ label, value, Icon, accent, dim }) => (
            <div key={label} style={{
              background: "var(--surface-100)", border: "1px solid var(--surface-200)",
              borderRadius: 14, padding: "18px 20px", minWidth: 0,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: dim,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
              }}>
                <Icon size={16} strokeWidth={1.8} style={{ color: accent }} />
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 28, fontWeight: 900, color: "var(--text-950)", lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        <SectionPanel title="Para entregar">
          {active.length === 0 ? (
            <EmptyState text="Nenhuma entrega pendente" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>
              {active.map((order) => (
                <DeliveryCard key={order.id} order={order} onAdvance={handleAdvance} />
              ))}
            </div>
          )}
        </SectionPanel>

        <div style={{ height: 20 }} />

        <SectionPanel title="Entregues">
          {done.length === 0 ? (
            <EmptyState text="Nenhuma entrega concluída ainda" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>
              {done.map((order) => (
                <DeliveryCard key={order.id} order={order} inactive />
              ))}
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  )
}

function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--surface-100)", border: "1px solid var(--surface-200)",
      borderRadius: 14, padding: "20px 24px",
    }}>
      <p style={{
        fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.9px",
        color: "var(--text-300)", marginBottom: 14,
      }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "20px 0" }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "var(--surface-50)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <Package size={17} strokeWidth={1.5} style={{ color: "var(--text-300)" }} />
      </div>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)", fontWeight: 500 }}>
        {text}
      </p>
    </div>
  )
}

function DeliveryCard({
  order,
  onAdvance,
  inactive,
}: {
  order: OrderWithItems
  onAdvance?: (id: string, status: string) => void
  inactive?: boolean
}) {
  const pill = getStatusPill(order)
  const nextStep = getNextStep(order)

  return (
    <div
      style={{
        background: inactive ? "var(--surface-50)" : "#fff",
        border: "1px solid var(--surface-200)",
        borderRadius: 12,
        padding: 16,
        opacity: inactive ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--gold-500)" }}>
            #{order.order_number}
          </span>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--text-950)", margin: "2px 0 0" }}>
            {order.customer_name}
          </p>
        </div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, color: "var(--text-950)", whiteSpace: "nowrap" }}>
          {formatCurrency(Number(order.total))}
        </span>
      </div>

      <span
        style={{
          alignSelf: "flex-start",
          display: "inline-flex", alignItems: "center", gap: 5,
          background: pill.bg, color: pill.color, padding: "3px 9px",
          borderRadius: 9999, fontFamily: "var(--font-ui)",
          fontSize: 10, fontWeight: 600,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: pill.pip, flexShrink: 0 }} />
        {pill.label}
      </span>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <MapPin size={14} strokeWidth={1.8} style={{ color: "var(--text-300)", flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-500)", lineHeight: 1.4 }}>
          {order.delivery_address}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <a
          href={mapsUrl(order.delivery_address!)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
            padding: "10px 12px", borderRadius: 9,
            background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
            color: "#fff", textDecoration: "none",
          }}
        >
          <Truck size={14} strokeWidth={2} /> Navegar
        </a>
        <a
          href={`tel:${order.customer_phone}`}
          title="Ligar para o cliente"
          style={{
            width: 40, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 9, border: "1px solid var(--surface-200)", color: "var(--text-500)",
          }}
        >
          <Phone size={14} strokeWidth={1.8} />
        </a>
      </div>

      {!inactive && nextStep && onAdvance && (
        <button
          onClick={() => onAdvance(order.id, nextStep.status)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
            padding: "9px 12px", borderRadius: 9,
            background: "transparent", border: "1px solid var(--surface-200)",
            color: "var(--text-700)", cursor: "pointer",
          }}
        >
          {nextStep.label}
        </button>
      )}
    </div>
  )
}
