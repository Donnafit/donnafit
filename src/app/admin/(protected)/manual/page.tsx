import { createClient } from "@/lib/supabase/server"
import { ManualClient } from "@/components/admin/ManualClient"

export const dynamic = "force-dynamic"

export default async function ManualPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Sem filtro de prep_instructions — produto novo não tem instrução nenhuma
  // ainda, e essa é a única tela onde dá pra cadastrar a primeira (o modal de
  // criar produto no Estoque não tem esse campo). Filtrar aqui deixava
  // produtos novos permanentemente inacessíveis pra adicionar modo de preparo.
  const { data: products } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("is_active", true)
    .order("sort_order")

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <ManualClient products={(products ?? []) as any[]} />
    </div>
  )
}
