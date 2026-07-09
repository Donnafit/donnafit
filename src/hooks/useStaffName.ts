"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/** Nome do usuário admin/kitchen logado, vindo de profiles.full_name (fallback: e-mail). */
export function useStaffName() {
  const [name, setName] = useState("")

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
      setName(profile?.full_name || user.email?.split("@")[0] || "Admin")
    })
  }, [])

  return name
}
