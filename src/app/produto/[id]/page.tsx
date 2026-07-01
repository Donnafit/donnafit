import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { AnnouncementBar } from "@/components/catalog/AnnouncementBar"
import { Header } from "@/components/catalog/Header"
import { Footer } from "@/components/catalog/Footer"
import { ProductDetailClient } from "@/components/catalog/ProductDetailClient"
import { CartBar } from "@/components/cart/CartBar"
import Link from "next/link"
import { resolveImageSrc } from "@/lib/utils"

export const dynamic = "force-dynamic"

// ─── Parser de descrição ─────────────────────────────────────────────────────

function parseDescription(text: string) {
  const allergenIdx = text.search(/AL[ÉE]RGICOS?\s*:/i)

  if (allergenIdx === -1) {
    return { main: text.trim(), allergens: null, portions: null }
  }

  const main = text.slice(0, allergenIdx).trim().replace(/\.\s*$/, "").trim()
  const rest  = text.slice(allergenIdx)

  // Detecta informações de porção: "PALAVRA: 180G"
  const portionIdx = rest.search(/[A-ZÁÉÍÓÚÃÕÊÂÔÛ\s]+:\s*\d+\s*[Gg]/)

  let allergens = rest.trim()
  const portions: Array<{ label: string; amount: string }> = []

  if (portionIdx > 0) {
    allergens = rest.slice(0, portionIdx).trim().replace(/\.\s*$/, "").trim()
    const portionsRaw = rest.slice(portionIdx)
    const portionPattern = /([A-ZÁÉÍÓÚÃÕÊÂÔÛ][^:0-9]+):\s*(\d+\s*[GgKkMmLl][LlGg]?)/g
    let m: RegExpExecArray | null
    while ((m = portionPattern.exec(portionsRaw)) !== null) {
      portions.push({ label: m[1].trim(), amount: m[2].toUpperCase().replace(/\s+/g, "") })
    }
  }

  return {
    main,
    allergens: allergens || null,
    portions: portions.length > 0 ? portions : null,
  }
}

// ─── Página ──────────────────────────────────────────────────────────────────

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
  const desc = parseDescription(product.description ?? "")

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)" }}>
      <AnnouncementBar />
      <Header />

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "28px 20px 80px" }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/"
            style={{ color: "#888", fontSize: 13, textDecoration: "none", fontFamily: "var(--font-switzer), sans-serif", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Cardápio
          </Link>
          <span style={{ color: "#CCC", fontSize: 13 }}>›</span>
          <span style={{ color: "#1A1A1A", fontSize: 13, fontFamily: "var(--font-switzer), sans-serif", fontWeight: 600 }}>{product.name}</span>
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
            marginBottom: 20,
          }}
          className="product-detail-hero"
        >
          {/* Imagem */}
          <div style={{ position: "relative", aspectRatio: "4/3", minHeight: 300 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveImageSrc(product.image_url, 800)}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
            />
            {category?.name && (
              <span
                style={{
                  position: "absolute",
                  top: 16, left: 16,
                  background: "rgba(20,20,20,0.6)",
                  backdropFilter: "blur(8px)",
                  color: "white",
                  borderRadius: 100,
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-switzer), sans-serif",
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

        {/* ── Descrição estruturada ─────────────────────────── */}
        {product.description && (
          <div style={{
            background: "#fff",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
          }}>

            {/* Cabeçalho */}
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid #F5F2EE",
            }}>
              <h2 style={{
                fontFamily: "var(--font-switzer), sans-serif",
                fontWeight: 900,
                fontSize: 11,
                color: "#C89B3C",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                margin: 0,
              }}>
                Descrição
              </h2>
            </div>

            {/* Texto principal */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{
                fontSize: 15,
                color: "#333",
                lineHeight: 1.75,
                margin: 0,
                fontFamily: "var(--font-switzer), sans-serif",
              }}>
                {desc.main}
              </p>
            </div>

            {/* Porções — se houver */}
            {desc.portions && (
              <div style={{
                padding: "0 24px 20px",
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}>
                {desc.portions.map(({ label, amount }) => (
                  <div key={label} style={{
                    background: "#F8F5F0",
                    borderRadius: 12,
                    padding: "10px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    minWidth: 110,
                  }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#AAA",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontFamily: "var(--font-switzer), sans-serif",
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: "#5A6B2A",
                      fontFamily: "var(--font-switzer), sans-serif",
                      lineHeight: 1,
                    }}>
                      {amount}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Alérgicos — se houver */}
            {desc.allergens && (
              <div style={{
                margin: "0 24px 24px",
                background: "#FFFAF0",
                border: "1px solid #F0E0B0",
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C89B3C" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#C89B3C",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 5,
                    fontFamily: "var(--font-switzer), sans-serif",
                  }}>
                    Alérgicos
                  </p>
                  <p style={{
                    fontSize: 13,
                    color: "#666",
                    lineHeight: 1.6,
                    margin: 0,
                    fontFamily: "var(--font-switzer), sans-serif",
                  }}>
                    {desc.allergens}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      <Footer />
      <CartBar />
    </div>
  )
}
