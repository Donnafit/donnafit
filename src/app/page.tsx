import { createClient } from "@/lib/supabase/server"
import { CatalogClient } from "@/components/catalog/CatalogClient"
import { CartBar } from "@/components/cart/CartBar"
import HeroSection from "@/components/catalog/HeroSection"
import { HeaderCartButton } from "@/components/cart/HeaderCartButton"

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
    <div className="min-h-screen pb-32" style={{ overflowX: 'hidden' }}>
      {/* Header — 3 colunas: [menu] [logo] [carrinho] */}
      <header
        style={{
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#FFFFFF',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 20px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Coluna esquerda — botão menu hamburguer (decorativo) */}
          <button
            aria-label="Menu"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={{ display: 'block', width: 20, height: 2, background: '#1A1A1A', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 14, height: 2, background: '#1A1A1A', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 20, height: 2, background: '#1A1A1A', borderRadius: 2 }} />
          </button>

          {/* Coluna central — logo circular */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '2px solid #C89B3C',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FFFDF8',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="Donna FIT"
                style={{ width: 36, height: 36, objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Coluna direita — botão carrinho reativo */}
          <HeaderCartButton />
        </div>
      </header>

      {/* Hero */}
      <HeroSection />

      {/* Produtos */}
      <main
        id="produtos"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '24px 16px',
        }}
      >
        <CatalogClient
          categories={categories ?? []}
          products={(products ?? []) as any[]}
        />
      </main>

      {/* Footer */}
      <footer style={{ background: '#1A1A1A', color: 'white', padding: '40px 20px', marginTop: -60 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 900, fontSize: 20, color: '#C89B3C', marginBottom: 4 }}>Donna FIT</div>
          <div style={{ fontSize: 13, color: '#5A6B2A', marginBottom: 24 }}>Alimentação Saudável</div>
          <p style={{ color: '#555', fontSize: 12 }}>© 2026 Donna FIT — Alimentação Saudável</p>
        </div>
      </footer>

      <CartBar />
    </div>
  )
}
