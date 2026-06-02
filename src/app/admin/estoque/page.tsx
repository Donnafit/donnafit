import { createClient } from "@/lib/supabase/server"
import { FreezerCountForm } from "@/components/kitchen/FreezerCountForm"
import type { Product } from "@/types"

export const revalidate = 0

export default async function EstoquePage() {
  const supabase = await createClient()

  const { data: productsRaw } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")

  const products = (productsRaw ?? []) as Product[]

  const comboProducts = products.filter(
    (p) => p.stock_type === "combo"
  )

  return (
    <div className="text-white p-4">
      <div className="mb-6">
        <h1 className="text-xl font-black">Controle de Estoque</h1>
        <p className="text-sm text-gray-400 mt-1">
          Faca a contagem fisica do freezer e atualize as quantidades
          disponiveis no cardapio.
        </p>
        <div className="bg-gray-800 rounded-xl px-4 py-2 mt-3 inline-block">
          <p className="text-xs text-gray-400">Combos no freezer</p>
          <p className="text-2xl font-black text-brand-gold">
            {comboProducts.reduce((s, p) => s + p.stock_quantity, 0)} un.
          </p>
        </div>
      </div>

      {comboProducts.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          Nenhum produto do tipo Combo cadastrado ainda.
        </p>
      ) : (
        <FreezerCountForm products={comboProducts} />
      )}
    </div>
  )
}
