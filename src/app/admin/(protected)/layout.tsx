// AUTH TEMPORARIAMENTE DESATIVADA — reativar antes do go-live
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminBottomNav } from "@/components/admin/AdminBottomNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--surface-50)" }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <AdminBottomNav />
    </div>
  )
}
