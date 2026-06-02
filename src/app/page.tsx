import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { CatalogClient } from "@/components/catalog/CatalogClient"
import { CartBar } from "@/components/cart/CartBar"

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
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Donna FIT"
            width={40}
            height={40}
            priority
          />
          <div>
            <h1 className="font-display font-black text-gray-900 text-lg leading-tight">
              DONNA FIT
            </h1>
            <p className="text-xs text-brand-green font-semibold">
              Alimentação Saudável
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        <CatalogClient
          categories={categories ?? []}
          products={(products ?? []) as any[]}
        />
      </main>
      <CartBar />
    </div>
  )
}
