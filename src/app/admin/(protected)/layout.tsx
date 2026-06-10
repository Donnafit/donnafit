// AUTH TEMPORARIAMENTE DESATIVADA — reativar antes do go-live
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminBottomNav } from "@/components/admin/AdminBottomNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "#F3F4F6" }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 overflow-auto pb-20 md:pb-0" style={{ background: "#F3F4F6" }}>
          {children}
        </main>
      </div>
      <AdminBottomNav />
      <style>{`
        .admin-main::-webkit-scrollbar { width: 5px; height: 5px; }
        .admin-main::-webkit-scrollbar-track { background: transparent; }
        .admin-main::-webkit-scrollbar-thumb { background: #C89B3C; border-radius: 99px; }
      `}</style>
    </div>
  )
}
