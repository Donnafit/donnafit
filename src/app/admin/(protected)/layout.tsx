// AUTH TEMPORARIAMENTE DESATIVADA — reativar antes do go-live
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminBottomNav } from "@/components/admin/AdminBottomNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="admin-layout"
      style={{
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        background: "var(--surface-50)",
      }}
    >
      <AdminSidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
          height: "100vh",
        }}
      >
        <main
          className="pb-16 md:pb-0"
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>
      <AdminBottomNav />
    </div>
  )
}
