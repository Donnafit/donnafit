import { AnnouncementBar } from "@/components/catalog/AnnouncementBar"
import { Header } from "@/components/catalog/Header"
import { Footer } from "@/components/catalog/Footer"
import Link from "next/link"

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function InfoPageLayout({ title, subtitle, children }: Props) {
  return (
    <div style={{
      overflow: "clip",
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)",
    }}>
      <AnnouncementBar />
      <Header activeCategory={null} />

      <main style={{ flex: 1, maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px", width: "100%" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#9E9790" }}>
          <Link href="/" style={{ color: "#9E9790", textDecoration: "none" }}>
            Início
          </Link>
          <span>/</span>
          <span style={{ color: "#5A6B2A", fontWeight: 600 }}>{title}</span>
        </div>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "var(--font-montserrat, Montserrat)",
            fontWeight: 900,
            fontSize: "clamp(24px, 5vw, 36px)",
            color: "#1A1A1A",
            lineHeight: 1.2,
            marginBottom: subtitle ? 12 : 0,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 15, color: "#7A7570", lineHeight: 1.7, maxWidth: 560 }}>
              {subtitle}
            </p>
          )}
          <div style={{ marginTop: 20, height: 3, width: 48, background: "linear-gradient(90deg, #5A6B2A, #C89B3C)", borderRadius: 2 }} />
        </div>

        {/* Conteúdo */}
        {children}
      </main>

      <Footer />
    </div>
  )
}
