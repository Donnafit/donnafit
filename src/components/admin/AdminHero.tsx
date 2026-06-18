"use client"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function getTodayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
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
  const stats = [
    { value: pendingCount,    label: "Pendentes",    valueColor: "#fff",              isString: false },
    { value: productionCount, label: "Em Produção",  valueColor: "#fff",              isString: false },
    { value: readyCount,      label: "Prontos",      valueColor: "#fff",              isString: false },
    {
      value: formatCurrencyShort(todayRevenue),
      label: `Hoje · ${todayOrdersCount} pedidos`,
      valueColor: "var(--gold-500)",
      isString: true,
    },
  ]

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--forest-850) 0%, var(--forest-700) 60%, var(--forest-600) 100%)",
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
            style={{
              fontFamily: "var(--font-display)",
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
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              textTransform: "capitalize",
            }}
          >
            {getTodayLabel()}
          </p>
        </div>

        {/* Live badge */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "7px 12px",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span
            style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: "#34D399",
              boxShadow: "0 0 0 2px rgba(52,211,153,0.2)",
              flexShrink: 0,
            }}
          />
          Sistema ao vivo
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: stat.isString ? 18 : 26,
                fontWeight: 900,
                color: stat.valueColor,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontWeight: 500,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
