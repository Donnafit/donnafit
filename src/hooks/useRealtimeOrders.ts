"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import type { OrderWithItems } from "@/types"

type OrderStatus = Database["public"]["Tables"]["orders"]["Update"]["status"]

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const latestFetchId = useRef(0)

  const fetchOrders = useCallback(async () => {
    const fetchId = ++latestFetchId.current
    const supabase = createClient()
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, product:products(*))")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(100)

    // Descarta fetches antigos que resolvem depois de um mais recente
    // (evita que um refetch disparado por um evento realtime anterior
    // sobrescreva um update otimista mais novo).
    if (fetchId !== latestFetchId.current) return

    setOrders((data as OrderWithItems[]) ?? [])
    setLoading(false)
  }, [])

  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      const validStatus = status as NonNullable<OrderStatus>

      // Save previous state for rollback
      const previousOrders = orders

      // Optimistic update: apply locally before hitting Supabase.
      // fetchOrders always excludes 'cancelled', so drop it locally too —
      // otherwise it lingers in "Todos" until the next realtime refetch.
      setOrders((current) =>
        validStatus === "cancelled"
          ? current.filter((o) => o.id !== orderId)
          : current.map((o) => (o.id === orderId ? { ...o, status: validStatus } : o))
      )

      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("orders") as any).update({ status }).eq("id", orderId)

      if (error) {
        // Revert to previous state and surface the error
        setOrders(previousOrders)
        console.error("Erro ao atualizar status do pedido:", error)
        throw error
      }
    },
    [orders]
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
