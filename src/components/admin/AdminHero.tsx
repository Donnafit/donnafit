"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Flame, CheckCircle2, TrendingUp } from "lucide-react"
import { useStaffName } from "@/hooks/useStaffName"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { ProfileModal } from "./ProfileModal"

const OPEN_HOUR  = 10
const CLOSE_HOUR = 22

async function getStoreHours() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { data } = await supabase.from("store_settings").select("open_hour, close_hour").eq("id", "default").single()
    if (!data) return { open: OPEN_HOUR, close: CLOSE_HOUR }
    return { open: Number(data.open_hour), close: Number(data.close_hour) }
  } catch {
    return { open: OPEN_HOUR, close: CLOSE_HOUR }
  }
}

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

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function CurrencyValue({ value }: { value: number }) {
  const parts = currencyFormatter.formatToParts(value)
  return (
    <>
      {parts.map((part, i) =>
        part.type === "currency" ? (
          <span key={i} style={{ fontSize: 16 }}>{part.value}</span>
        ) : (
          part.value
        )
      )}
    </>
  )
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
  const staffName = useStaffName()
  const router = useRouter()
  const { user } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)

  useEffect(() => {
    if (staffName) setProfileName(staffName)
  }, [staffName])

  async function handleSaveProfile(newName: string, photo: string | null) {
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      await supabase.from("profiles").update({ full_name: newName }).eq("id", user.id)
    }
    setProfileName(newName)
    setProfilePhoto(photo)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/acessoadmin")
  }

  useEffect(() => {
    async function check() {
      const h = new Date().getHours()
      const { open, close } = await getStoreHours()
      setIsOpen(h >= open && h < close)
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
      label: "Em Separação",
      sub: "em preparo",
      accent: "#60A5FA",
      dimAccent: "rgba(96,165,250,0.12)",
      Icon: Flame,
      isString: false,
    },
    {
      value: readyCount,
      label: "Liberados",
      sub: "balcão + rota",
      accent: "#34D399",
      dimAccent: "rgba(52,211,153,0.12)",
      Icon: CheckCircle2,
      isString: false,
    },
    {
      value: todayRevenue,
      label: "Faturamento",
      sub: `${todayOrdersCount} pedido${todayOrdersCount !== 1 ? "s" : ""} hoje`,
      accent: "var(--gold-500)",
      dimAccent: "rgba(200,155,60,0.14)",
      Icon: TrendingUp,
      isString: true,
    },
  ]

  return (
    <>
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

      {/* Acesso ao menu — só mobile, sidebar já cobre isso no desktop */}
      <button
        onClick={() => setShowProfile(true)}
        className="admin-hero-mobile-avatar"
        aria-label="Abrir menu de configurações"
        style={{
          position: "relative", zIndex: 1,
          width: 44, height: 44, borderRadius: "50%",
          background: profilePhoto ? "transparent" : "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
          border: "2px solid rgba(255,255,255,0.15)",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", cursor: "pointer", overflow: "hidden", padding: 0,
        }}
      >
        {profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profilePhoto} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 800, color: "#fff" }}>
            {(profileName || "A").charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {/* Greeting row */}
      <div
        className="flex flex-col items-center text-center gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between sm:text-left"
        style={{ position: "relative", zIndex: 1 }}
      >
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
            {getGreeting()}{staffName ? `, ${staffName}` : ""}
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
        className="grid grid-cols-2 md:grid-cols-4"
        style={{
          gap: 8,
          position: "relative",
          zIndex: 1,
          marginTop: 4,
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            className={i < 2 ? "admin-hero-stat-fade" : undefined}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
              borderRadius: "12px 12px 0 0",
              padding: "14px 18px 16px",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 6px 10px -4px rgba(0,0,0,0.35)",
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
              fontSize: 30,
              fontWeight: 900,
              color: stat.isString ? stat.accent : "#fff",
              lineHeight: 1,
              marginBottom: 5,
            }}>
              {stat.isString ? <CurrencyValue value={stat.value as number} /> : stat.value}
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

      <style>{`
        @media (max-width: 767px) {
          .admin-hero-stat-fade {
            -webkit-mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
            mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
          }
        }
        .admin-hero-mobile-avatar { display: flex; }
        @media (min-width: 768px) {
          .admin-hero-mobile-avatar { display: none; }
        }
      `}</style>
    </div>

    {showProfile && (
      <ProfileModal
        name={profileName}
        photo={profilePhoto}
        email={user?.email ?? ""}
        topAnchored
        onSave={handleSaveProfile}
        onClose={() => setShowProfile(false)}
        onLogout={handleLogout}
      />
    )}
    </>
  )
}
