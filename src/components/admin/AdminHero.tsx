"use client"
import { useEffect, useState } from "react"
import { Clock, Flame, CheckCircle2, TrendingUp } from "lucide-react"

const OPEN_HOUR  = 10
const CLOSE_HOUR = 22

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function getTodayLabel() {
  const s = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatCurrencyShort(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

interface Props {
  pendingCount: number
  productionCount: number
  readyCount: number
  todayRevenue: number
  todayOrdersCount: number
}

export function AdminHero({
  pendingCount,
  productionCount,
  readyCount,
  todayRevenue,
  todayOrdersCount,
}: Props) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null)

  useEffect(() => {
    function check() {
      const h = new Date().getHours()
      setIsOpen(h >= OPEN_HOUR && h < CLOSE_HOUR)
    }
    check()
    const t = setInterval(check, 60_000)
    return () => clearInterval(t)
  }, [])

  const stats = [
    {
      value: pendingCount,
      label: "Pendentes",
      sub: "aguardando",
      accent: "#F59E0B",
      dimAccent: "rgba(245,158,11,0.14)",
      Icon: Clock,
      isString: false,
    },
    {
      value: productionCount,
      label: "Em Produção",
      sub: "em preparo",
      accent: "#60A5FA",
      dimAccent: "rgba(96,165,250,0.12)",
      Icon: Flame,
      isString: false,
    },
    {
      value: readyCount,
      label: "Prontos",
      sub: "para retirar",
      accent: "#34D399",
      dimAccent: "rgba(52,211,153,0.12)",
      Icon: CheckCircle2,
      isString: false,
    },
    {
      value: formatCurrencyShort(todayRevenue),
      label: "Faturamento",
      sub: `${todayOrdersCount} pedido${todayOrdersCount !== 1 ? "s" : ""} hoje`,
      accent: "var(--gold-500)",
      dimAccent: "rgba(200,155,60,0.14)",
      Icon: TrendingUp,
      isString: true,
    },
  ]

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--forest-850, #0F1A0F) 0%, var(--forest-700, #1A2F1A) 60%, var(--forest-600, #142414) 100%)",
        padding: "28px 32px 0",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Radial glow decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -60, right: -60,
          width: 260, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,155,60,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Greeting row */}
      <div className="flex items-start justify-between mb-6" style={{ position: "relative", zIndex: 1 }}>
        <div>
          <h2
            suppressHydrationWarning
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {getGreeting()}, Everson
          </h2>
          <p
            suppressHydrationWarning
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {getTodayLabel()}
          </p>
        </div>

        {/* Status badge */}
        {isOpen !== null && (
          <div
            className="flex items-center gap-2"
            style={{
              background: isOpen ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isOpen ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 8,
              padding: "7px 12px",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: isOpen ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.35)",
              transition: "all 400ms",
            }}
          >
            <span
              style={{
                width: 6, height: 6,
                borderRadius: "50%",
                background: isOpen ? "#34D399" : "rgba(255,255,255,0.25)",
                boxShadow: isOpen ? "0 0 0 2px rgba(52,211,153,0.2)" : "none",
                flexShrink: 0,
              }}
            />
            {isOpen ? "Restaurante Online" : "Restaurante Fechado"}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          position: "relative",
          zIndex: 1,
          marginTop: 4,
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
              borderRadius: "12px 12px 0 0",
              padding: "14px 18px 16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Icon badge */}
            <div style={{
              position: "absolute",
              top: 12, right: 14,
              width: 28, height: 28,
              borderRadius: 8,
              background: stat.dimAccent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <stat.Icon size={13} strokeWidth={2} style={{ color: stat.accent }} />
            </div>

            {/* Label */}
            <p style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.7px",
              color: "rgba(255,255,255,0.35)",
              marginBottom: 8,
            }}>
              {stat.label}
            </p>

            {/* Value */}
            <p style={{
              fontFamily: "var(--font-ui)",
              fontSize: stat.isString ? 17 : 30,
              fontWeight: 900,
              color: stat.isString ? stat.accent : "#fff",
              lineHeight: 1,
              marginBottom: 5,
            }}>
              {stat.value}
            </p>

            {/* Sub-label */}
            <p style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "rgba(255,255,255,0.25)",
              fontWeight: 500,
            }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
