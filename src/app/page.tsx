import { createClient } from "@/lib/supabase/server"
import { CatalogClient } from "@/components/catalog/CatalogClient"
import { CartBar } from "@/components/cart/CartBar"
import HeroSection from "@/components/catalog/HeroSection"
import { HeaderCartButton } from "@/components/cart/HeaderCartButton"
import Link from "next/link"

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("products")
      .select("*, categories(name, slug)")
      .eq("is_active", true)
      .order("sort_order"),
  ])

  return (
    <div className="min-h-screen" style={{ overflowX: "hidden" }}>
      {/* ── Header ── */}
      <header
        style={{
          height: 68,
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,253,248,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(229,224,216,0.7)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 20px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "2px solid #C89B3C",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#FFFDF8",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Donna FIT"
                style={{ width: 32, height: 32, objectFit: "contain" }}
              />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                  fontWeight: 900,
                  fontSize: 17,
                  color: "#1A1A1A",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                Donna FIT
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#5A6B2A",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Alimentação Saudável
              </div>
            </div>
          </Link>

          {/* Nav — desktop only */}
          <nav
            className="hidden md:flex"
            style={{ alignItems: "center", gap: 4 }}
          >
            {[
              { href: "/", label: "Cardápio" },
              { href: "/carrinho", label: "Meu Pedido" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hover:bg-[#F5F0E8] hover:text-[#C89B3C]"
                style={{
                  color: "#555",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: 10,
                  transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                  fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Cart */}
          <HeaderCartButton />
        </div>
      </header>

      {/* Hero */}
      <HeroSection />

      {/* Products */}
      <main
        id="produtos"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px 20px 40px",
        }}
      >
        <CatalogClient
          categories={categories ?? []}
          products={(products ?? []) as any[]}
        />
      </main>

      {/* Footer */}
      <footer
        style={{
          background: "#1A1A1A",
          color: "white",
          padding: "48px 24px",
          marginTop: -60,
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-montserrat)",
                fontWeight: 900,
                fontSize: 22,
                color: "#C89B3C",
                letterSpacing: "-0.02em",
              }}
            >
              Donna FIT
            </div>
            <div style={{ fontSize: 12, color: "#5A6B2A", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Alimentação Saudável
            </div>
          </div>
          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            {[
              { href: "/", label: "Cardápio" },
              { href: "/carrinho", label: "Meu Pedido" },
              { href: "/admin", label: "Área Admin" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-white"
                style={{
                  color: "#666",
                  fontSize: 13,
                  textDecoration: "none",
                  padding: "6px 14px",
                  borderRadius: 8,
                  transition: "color 0.2s ease",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 20,
              textAlign: "center",
              color: "#444",
              fontSize: 12,
            }}
          >
            © 2026 Donna FIT — Todos os direitos reservados
          </div>
        </div>
      </footer>

      <CartBar />
    </div>
  )
}
