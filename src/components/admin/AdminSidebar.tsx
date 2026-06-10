"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ChefHat, Package, LogOut, QrCode, Megaphone, BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { href: "/admin/pedidos",  label: "Pedidos",          icon: LayoutDashboard },
  { href: "/admin/cozinha",  label: "Cozinha",           icon: ChefHat },
  { href: "/admin/manual",   label: "Manual de Preparo", icon: BookOpen },
  { href: "/admin/estoque",  label: "Estoque",           icon: Package },
  { href: "/admin/anuncios", label: "Anúncios",          icon: Megaphone },
  { href: "/admin/qrcode",   label: "QR Code",           icon: QrCode },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return (
    <aside className="hidden md:flex flex-col w-60 text-white min-h-screen shrink-0" style={{ background: "#111827" }}>
      {/* Logo */}
      <div className="p-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Image src="/logo.svg" alt="Donna FIT" width={32} height={32} />
        <div>
          <span className="font-display font-black text-sm text-white block leading-tight">DONNA FIT</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(200,155,60,0.15)", color: "#C89B3C" }}>Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={isActive
                ? { background: "rgba(200,155,60,0.15)", color: "#C89B3C" }
                : { color: "rgba(255,255,255,0.5)" }
              }
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)" } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)" } }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: "#C89B3C", color: "#111" }}>D</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">Donna FIT</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Administradora</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.3)" }} title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
