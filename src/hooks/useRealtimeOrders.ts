"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { OrderWithItems } from "@/types"

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, product:products(*))")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(100)

    setOrders((data as OrderWithItems[]) ?? [])
    setLoading(false)
  }, [])

  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      const supabase = createClient()
      const validStatus = status as "pending" | "production" | "ready" | "delivered" | "cancelled"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("orders") as any).update({ status: validStatus }).eq("id", orderId)
    },
    []
  )

  useEffect(() => {
    fetchOrders()

    const supabase = createClient()
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => { fetchOrders() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrders])

  return { orders, loading, updateStatus }
}
