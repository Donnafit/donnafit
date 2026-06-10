"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ChefHat, Package, QrCode, BookOpen } from "lucide-react"

const NAV = [
  { href: "/admin/pedidos",  label: "Pedidos",  icon: LayoutDashboard },
  { href: "/admin/cozinha",  label: "Cozinha",  icon: ChefHat },
  { href: "/admin/manual",   label: "Manual",   icon: BookOpen },
  { href: "/admin/estoque",  label: "Estoque",  icon: Package },
  { href: "/admin/qrcode",   label: "QR Code",  icon: QrCode },
]

export function AdminBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-10" style={{ background: "#111827", borderColor: "rgba(255,255,255,0.08)" }}>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
          style={{ color: pathname.startsWith(href) ? "#C89B3C" : "rgba(255,255,255,0.4)" }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
