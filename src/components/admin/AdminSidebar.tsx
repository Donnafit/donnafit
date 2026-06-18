"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, ChefHat, Package, LogOut,
  QrCode, Megaphone, BookOpen,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV_GROUPS = [
  {
    label: "Operação",
    items: [
      { href: "/admin/pedidos",  label: "Pedidos",          icon: LayoutDashboard, badge: true },
      { href: "/admin/cozinha",  label: "Cozinha",           icon: ChefHat },
      { href: "/admin/manual",   label: "Manual de Preparo", icon: BookOpen },
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

interface Props {
  pendingCount?: number
}

export function AdminSidebar({ pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return (
    <aside
      className="hidden md:flex flex-col shrink-0"
      style={{ width: 232, background: "var(--forest-900)", minHeight: "100vh" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-[18px] py-[22px]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 34, height: 34, borderRadius: 9, background: "var(--gold-500)" }}
        >
          <Image src="/logo.svg" alt="Donna FIT" width={18} height={18} />
        </div>
        <div>
          <span
            className="block text-white leading-tight"
            style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, letterSpacing: "1px" }}
          >
            DONNA FIT
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui)" }}>
            Painel Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <p
              className="px-2 mb-1"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.18)",
              }}
            >
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname.startsWith(href)
              const count = badge ? pendingCount : 0
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-[10px] mb-[1px] relative"
                  style={{
                    padding: "9px 10px",
                    borderRadius: 10,
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: isActive ? "var(--gold-500)" : "rgba(255,255,255,0.38)",
                    background: isActive ? "var(--gold-dim)" : "transparent",
                    transition: "all var(--duration-micro) var(--ease-standard)",
                    textDecoration: "none",
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: 20,
                        background: "var(--gold-500)",
                        borderRadius: "0 3px 3px 0",
                      }}
                    />
                  )}
                  <Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                  <span className="flex-1">{label}</span>
                  {badge && count > 0 && (
                    <span
                      style={{
                        background: "var(--gold-500)",
                        color: "#000",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 9999,
                        fontFamily: "var(--font-ui)",
                        lineHeight: "16px",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        className="flex items-center gap-[10px] p-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          E
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "var(--font-ui)" }}>
            Everson
          </p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui)" }}>
            Administrador
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Sair"
        >
          <LogOut size={12} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.3)" }} />
        </button>
      </div>
    </aside>
  )
}
