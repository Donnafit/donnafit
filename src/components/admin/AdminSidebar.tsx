"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ChefHat, Package, LogOut, QrCode } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { href: "/admin/pedidos", label: "Pedidos",  icon: LayoutDashboard },
  { href: "/admin/cozinha", label: "Cozinha",  icon: ChefHat },
  { href: "/admin/estoque", label: "Estoque",  icon: Package },
  { href: "/admin/qrcode",  label: "QR Code",  icon: QrCode },
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
    <aside className="hidden md:flex flex-col w-56 bg-gray-900 text-white min-h-screen shrink-0">
      <div className="p-5 flex items-center gap-3 border-b border-gray-800">
        <Image src="/logo.svg" alt="Donna FIT" width={32} height={32} />
        <span className="font-display font-black text-sm text-brand-gold">
          DONNA FIT
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              pathname.startsWith(href)
                ? "bg-brand-gold text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
