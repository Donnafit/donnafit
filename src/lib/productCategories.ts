export interface CategoryCatalogEntry {
  id: string
  name: string
  slug: string
  sort_order: number
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createCategory(supabase: any, name: string, existing: CategoryCatalogEntry[]): Promise<CategoryCatalogEntry> {
  const trimmed = name.trim()
  const slug = slugify(trimmed)
  if (!slug) throw new Error("Nome de categoria inválido.")
  if (existing.some((c) => c.slug === slug || c.name.toLowerCase() === trimmed.toLowerCase()))
    throw new Error("Já existe uma categoria com esse nome.")

  const nextSortOrder = existing.reduce((max, c) => Math.max(max, c.sort_order), -1) + 1

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: trimmed, slug, sort_order: nextSortOrder })
    .select("id, name, slug, sort_order")
    .single()

  if (error) {
    if (error.code === "23505") throw new Error("Já existe uma categoria com esse nome.")
    throw error
  }
  return data
}
