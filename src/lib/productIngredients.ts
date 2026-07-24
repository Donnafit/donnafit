export interface IngredientCatalogEntry {
  id: string
  name: string
}

export interface IngredientRow {
  ingredientId: string
  name: string
  quantity: string
  unit: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchIngredientCatalog(supabase: any): Promise<IngredientCatalogEntry[]> {
  const { data } = await supabase.from("ingredients").select("id, name").order("name")
  return data ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createIngredient(supabase: any, name: string): Promise<IngredientCatalogEntry> {
  const { data, error } = await supabase
    .from("ingredients")
    .insert({ name: name.trim() })
    .select("id, name")
    .single()
  if (error) throw error
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchProductIngredients(supabase: any, productId: string): Promise<IngredientRow[]> {
  const { data } = await supabase
    .from("product_ingredients")
    .select("ingredient_id, quantity, unit, sort_order, ingredients(name)")
    .eq("product_id", productId)
    .order("sort_order")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ingredientId: row.ingredient_id,
    name: row.ingredients?.name ?? "",
    quantity: String(row.quantity),
    unit: row.unit,
  }))
}

// Apaga tudo e reinsere — mesma estratégia já usada pra combo_items em
// ProductModal.handleSubmit. Lista vazia só apaga (não insere nada);
// quem decide se isso deve ou não mexer em products.description é quem
// chama esta função (ver regra de "só sobrescreve se não-vazia" na spec).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProductIngredients(supabase: any, productId: string, rows: IngredientRow[]): Promise<void> {
  await supabase.from("product_ingredients").delete().eq("product_id", productId)
  const valid = rows.filter((r) => r.ingredientId && Number(r.quantity) > 0)
  if (valid.length === 0) return
  const payload = valid.map((r, index) => ({
    product_id: productId,
    ingredient_id: r.ingredientId,
    quantity: Number(r.quantity),
    unit: r.unit.trim() || "g",
    sort_order: index,
  }))
  const { error } = await supabase.from("product_ingredients").insert(payload)
  if (error) throw error
}
