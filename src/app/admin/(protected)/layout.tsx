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
          className="mb-16 md:mb-0"
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
