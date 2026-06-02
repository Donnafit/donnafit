"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ChefHat, Package } from "lucide-react"

const NAV = [
  { href: "/admin/pedidos", label: "Pedidos", icon: LayoutDashboard },
  { href: "/admin/cozinha", label: "Cozinha", icon: ChefHat },
  { href: "/admin/estoque", label: "Estoque", icon: Package },
]

export function AdminBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-10">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            pathname.startsWith(href) ? "text-brand-gold" : "text-gray-400"
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
