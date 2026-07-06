"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, ChefHat, Package,
  QrCode, Megaphone, BookOpen, Truck,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ProfileModal } from "./ProfileModal"

const NAV_GROUPS = [
  {
    label: "Operação",
    items: [
      { href: "/admin/pedidos",       label: "Pedidos",          icon: LayoutDashboard, badge: true },
      { href: "/admin/cozinha",       label: "Cozinha",           icon: ChefHat },
      { href: "/admin/rota-entrega",  label: "Rota de Entrega",   icon: Truck },
      { href: "/admin/manual",        label: "Manual de Preparo", icon: BookOpen },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin/estoque",  label: "Estoque",  icon: Package },
      { href: "/admin/anuncios", label: "Anúncios", icon: Megaphone },
      { href: "/admin/qrcode",   label: "QR Code",  icon: QrCode },
    ],
  },
]

const EXPANDED_W = 232
const COLLAPSED_W = 64

interface Props {
  pendingCount?: number
}

export function AdminSidebar({ pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [collapsed,    setCollapsed]    = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [profileName,  setProfileName]  = useState("Everson")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  function handleSaveProfile(name: string, photo: string | null) {
    setProfileName(name)
    setProfilePhoto(photo)
  }

  const w = collapsed ? COLLAPSED_W : EXPANDED_W

  return (
    <>
      <aside
        className="hidden md:flex flex-col shrink-0"
        style={{
          width: w,
          minWidth: w,
          background: "var(--forest-900)",
          minHeight: "100vh",
          transition: "width 220ms ease, min-width 220ms ease",
          overflow: "hidden",
        }}
      >
        {/* Logo header */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            padding: "16px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: collapsed ? "center" : "space-between",
            flexShrink: 0,
          }}
        >
          {/* Logo + nome */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: "50%", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Image src="/logo.svg" alt="Donna FIT" width={20} height={20} />
            </div>
            {!collapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1, overflow: "hidden" }}>
                <span style={{
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 900,
                  letterSpacing: "1px", color: "#fff", lineHeight: 1, whiteSpace: "nowrap",
                }}>
                  DONNA FIT
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui)", lineHeight: 1 }}>
                  Painel Admin
                </span>
              </div>
            )}
          </div>

          {/* Toggle — no cabeçalho quando expandido */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Recolher menu"
              style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                background: "rgba(255,255,255,0.05)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
            >
              <PanelLeftClose size={14} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: collapsed ? 4 : 24 }}>
              {!collapsed && (
                <p style={{
                  padding: "0 8px", marginBottom: 4,
                  fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "1.4px", textTransform: "uppercase",
                  color: "rgba(255,255,255,0.18)",
                }}>
                  {group.label}
                </p>
              )}
              {collapsed && <div style={{ height: 8 }} />}

              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const isActive = pathname.startsWith(href)
                const count    = badge ? pendingCount : 0
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: collapsed ? 0 : 10,
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "10px 0" : "9px 10px",
                      borderRadius: 10,
                      marginBottom: 1,
                      fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
                      color: isActive ? "var(--gold-500)" : "rgba(255,255,255,0.38)",
                      background: isActive ? "var(--gold-dim)" : "transparent",
                      transition: "all 150ms",
                      textDecoration: "none",
                      position: "relative",
                    }}
                  >
                    <Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                    {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
                    {badge && count > 0 && !collapsed && (
                      <span style={{
                        background: "var(--gold-500)", color: "#000",
                        fontSize: 9, fontWeight: 700,
                        padding: "1px 7px", borderRadius: 9999,
                        fontFamily: "var(--font-ui)", lineHeight: "16px",
                      }}>
                        {count}
                      </span>
                    )}
                    {/* Badge dot quando recolhido */}
                    {badge && count > 0 && collapsed && (
                      <span style={{
                        position: "absolute", top: 6, right: 10,
                        width: 7, height: 7, borderRadius: "50%",
                        background: "var(--gold-500)",
                      }} />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer — perfil */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          {/* Toggle — acima do perfil quando recolhido */}
          {collapsed && (
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <button
                onClick={() => setCollapsed(false)}
                title="Expandir menu"
                style={{
                  width: 36, height: 36, borderRadius: 9, border: "none",
                  background: "rgba(255,255,255,0.05)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 150ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
              >
                <PanelLeftOpen size={15} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
            </div>
          )}

          <button
            onClick={() => setShowProfile(true)}
            title={collapsed ? profileName : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "12px 0" : "14px 16px",
              width: "100%", border: "none",
              background: "transparent", cursor: "pointer",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: "50%", overflow: "hidden",
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, color: "#fff",
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {profilePhoto
                ? <Image src={profilePhoto} alt="Perfil" width={34} height={34} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                : profileName.charAt(0).toUpperCase()
              }
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "var(--font-ui)" }}>
                    {profileName}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui)" }}>
                    Administrador
                  </p>
                </div>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.18)", lineHeight: 1 }}>›</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {showProfile && (
        <ProfileModal
          name={profileName}
          photo={profilePhoto}
          sidebarWidth={w}
          onSave={handleSaveProfile}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}
