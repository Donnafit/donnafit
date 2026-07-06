import { createClient } from "@/lib/supabase/server"

/** Returns the logged-in user if they're admin/kitchen staff, otherwise null. */
export async function requireStaff() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "kitchen"].includes(profile.role)) return null
  return user
}
