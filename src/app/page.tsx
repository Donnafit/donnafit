import { createClient } from "@/lib/supabase/server"
import { CatalogClient } from "@/components/catalog/CatalogClient"
import { CartBar } from "@/components/cart/CartBar"
import HeroSection from "@/components/catalog/HeroSection"
import { AnnouncementBar } from "@/components/catalog/AnnouncementBar"
import { Header } from "@/components/catalog/Header"
import { Footer } from "@/components/catalog/Footer"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams: { cat?: string }
}) {
  const supabase = await createClient()
  const activeCategory = searchParams?.cat ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: categories }, { data: products }, { data: announcementsRaw }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("products")
      .select("*, categories(name, slug)")
      .eq("is_active", true)
      .order("sort_order"),
    sb.from("announcements").select("text").eq("is_active", true).order("sort_order"),
  ])
  const announcements = (announcementsRaw ?? []) as Array<{ text: string }>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)' }}>
      {/* Announcement bar — frases do banco */}
      <AnnouncementBar phrases={announcements?.map((a) => a.text) ?? []} />

      {/* Header elegante */}
      <Header activeCategory={activeCategory} />

      {/* Hero */}
      <HeroSection />

      {/* Produtos */}
      <main id="produtos" style={{ flex: 1 }}>
        <CatalogClient
          categories={categories ?? []}
          products={(products ?? []) as any[]}
          initialCategory={activeCategory}
        />
      </main>

      <Footer />

      <CartBar />
    </div>
  )
}
