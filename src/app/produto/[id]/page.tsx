import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { AnnouncementBar } from "@/components/catalog/AnnouncementBar"
import { Header } from "@/components/catalog/Header"
import { ProductDetailClient } from "@/components/catalog/ProductDetailClient"
import { CartBar } from "@/components/cart/CartBar"
import Link from "next/link"
import Image from "next/image"

export const dynamic = "force-dynamic"

export default async function ProductPage({ params }: { params: { id: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("id", params.id)
    .eq("is_active", true)
    .single()

  if (!product) notFound()

  const category = (product as any).categories

  return (
    <div style={{ overflow: "clip", display: "flex", flexDirection: "column", minHeight: "100vh", background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)" }}>
      <AnnouncementBar />
      <Header />

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "28px 20px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/"
            style={{ color: "#888", fontSize: 13, textDecoration: "none", fontFamily: "var(--font-montserrat)", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Cardápio
          </Link>
          <span style={{ color: "#CCC", fontSize: 13 }}>›</span>
          <span style={{ color: "#1A1A1A", fontSize: 13, fontFamily: "var(--font-montserrat)", fontWeight: 600 }}>{product.name}</span>
        </div>

        {/* Hero: Imagem + Info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 32,
            background: "#fff",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
            marginBottom: 28,
          }}
          className="product-detail-hero"
        >
          {/* Imagem */}
          <div style={{ position: "relative", aspectRatio: "4/3", minHeight: 300 }}>
            <Image
              src={product.image_url ?? "/marmita.jpg"}
              alt={product.name}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
            {category?.name && (
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  background: "rgba(20,20,20,0.6)",
                  backdropFilter: "blur(8px)",
                  color: "white",
                  borderRadius: 100,
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-montserrat)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                {category.name}
              </span>
            )}
          </div>

          {/* Info + Botão (Client Component) */}
          <ProductDetailClient product={product as any} />
        </div>

        {/* Descrição completa */}
        {product.description && (
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <h2
              style={{
                fontFamily: "var(--font-montserrat)",
                fontWeight: 900,
                fontSize: 16,
                color: "#1A1A1A",
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Descrição
            </h2>
            <p style={{ fontSize: 15, color: "#444", lineHeight: 1.7, margin: 0 }}>{product.description}</p>
          </div>
        )}
      </main>

      <footer style={{ background: "#1A1A1A", color: "white", padding: "40px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-montserrat)", fontWeight: 900, fontSize: 20, color: "#C89B3C", marginBottom: 4 }}>Donna FIT</div>
          <div style={{ fontSize: 13, color: "#5A6B2A", marginBottom: 24 }}>Alimentação Saudável</div>
          <p style={{ color: "#555", fontSize: 12 }}>© 2026 Donna FIT — Alimentação Saudável</p>
        </div>
      </footer>

      <CartBar />
    </div>
  )
}
