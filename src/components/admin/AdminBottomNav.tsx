"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ChefHat, Package, BookOpen, Truck } from "lucide-react"

const NAV = [
  { href: "/admin/pedidos",       label: "Pedidos",  icon: LayoutDashboard },
  { href: "/admin/cozinha",       label: "Cozinha",  icon: ChefHat },
  { href: "/admin/rota-entrega",  label: "Entrega",  icon: Truck },
  { href: "/admin/estoque",       label: "Estoque",  icon: Package },
  { href: "/admin/manual",        label: "Manual",   icon: BookOpen },
]

export function AdminBottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 flex z-10"
      style={{
        background: "var(--forest-900)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              fontWeight: 600,
              color: isActive ? "var(--gold-500)" : "rgba(255,255,255,0.35)",
              textDecoration: "none",
              transition: "color var(--duration-micro)",
            }}
          >
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
