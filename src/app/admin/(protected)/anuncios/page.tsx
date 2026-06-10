import { createClient } from "@/lib/supabase/server"
import { AnunciosClient } from "@/components/admin/AnunciosClient"

export const dynamic = "force-dynamic"

export default async function AnunciosPage() {
  const supabase = await createClient()
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("sort_order")

  return <AnunciosClient announcements={announcements ?? []} />
}
