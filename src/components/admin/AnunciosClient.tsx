"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"

type Announcement = Database["public"]["Tables"]["announcements"]["Row"]

interface Props {
  announcements: Announcement[]
}

export function AnunciosClient({ announcements: initial }: Props) {
  const [items, setItems]   = useState<Announcement[]>(initial)
  const [newText, setNewText] = useState("")
  const [adding, setAdding]  = useState(false)
  const [error, setError]    = useState<string | null>(null)
  const [, startTransition]  = useTransition()
  const router = useRouter()

  async function handleAdd() {
    if (!newText.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, sort_order: items.length + 1 }),
      })
      const created = await res.json()
      if (!res.ok) throw new Error(created.error)
      setItems((prev) => [...prev, created as Announcement])
      setNewText("")
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar")
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(item: Announcement) {
    setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, is_active: !a.is_active } : a)))
    await fetch("/api/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    })
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover este aviso? Essa ação não pode ser desfeita.")) return
    setItems((prev) => prev.filter((a) => a.id !== id))
    await fetch("/api/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    startTransition(() => router.refresh())
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const a = items[index]
    const b = items[target]

    const next = [...items]
    next[index] = { ...b, sort_order: a.sort_order }
    next[target] = { ...a, sort_order: b.sort_order }
    setItems(next)

    await Promise.all([
      fetch("/api/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, sort_order: b.sort_order }),
      }),
      fetch("/api/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, sort_order: a.sort_order }),
      }),
    ])
    startTransition(() => router.refresh())
  }

  const activeCount = items.filter((a) => a.is_active).length

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--surface-50)" }}>
      {/* Header */}
      <div style={{
        background: "var(--surface-100)",
        borderBottom: "1px solid var(--surface-200)",
        padding: "20px 28px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: "rgba(200,155,60,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Megaphone size={16} strokeWidth={1.8} style={{ color: "var(--gold-500)" }} />
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 800, color: "var(--text-950)" }}>
            Avisos do Site
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 1 }}>
            Frases que aparecem na barra verde no topo do cardápio
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 28px" }}>
        {/* Add new */}
        <div style={{
          background: "var(--surface-100)",
          border: "1px solid var(--surface-200)",
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 16,
        }}>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.7px",
            color: "var(--text-300)", marginBottom: 10,
          }}>
            Novo aviso
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Ex: Frete grátis acima de R$ 80 esta semana!"
              style={{
                flex: 1,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--text-950)",
                background: "var(--surface-50)",
                border: "1px solid var(--surface-200)",
                borderRadius: 9,
                padding: "10px 14px",
                outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newText.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
                padding: "10px 18px", borderRadius: 9,
                background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                color: "#fff",
                border: "none", cursor: "pointer",
                opacity: adding || !newText.trim() ? 0.45 : 1,
                flexShrink: 0,
                transition: "opacity 150ms",
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Adicionar
            </button>
          </div>
          {error && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#EF4444", marginTop: 6 }}>
              {error}
            </p>
          )}
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.length === 0 && (
            <div style={{
              background: "var(--surface-100)",
              border: "1px solid var(--surface-200)",
              borderRadius: 14,
              padding: "48px 24px",
              textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            }}>
              <Megaphone size={28} strokeWidth={1.5} style={{ color: "var(--text-300)", opacity: 0.5 }} />
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-300)" }}>
                Nenhum aviso cadastrado. Adicione o primeiro acima.
              </p>
            </div>
          )}

          {items.map((item, index) => (
            <div
              key={item.id}
              data-testid="announcement-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--surface-100)",
                border: "1px solid var(--surface-200)",
                borderRadius: 11,
                padding: "12px 16px",
                opacity: item.is_active ? 1 : 0.45,
                transition: "opacity 200ms",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <button
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  title="Mover para cima"
                  style={{
                    width: 20, height: 16, border: "none", background: "transparent",
                    cursor: index === 0 ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: index === 0 ? 0.25 : 1,
                  }}
                >
                  <ChevronUp size={13} strokeWidth={2} style={{ color: "var(--text-300)" }} />
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  disabled={index === items.length - 1}
                  title="Mover para baixo"
                  style={{
                    width: 20, height: 16, border: "none", background: "transparent",
                    cursor: index === items.length - 1 ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: index === items.length - 1 ? 0.25 : 1,
                  }}
                >
                  <ChevronDown size={13} strokeWidth={2} style={{ color: "var(--text-300)" }} />
                </button>
              </div>

              <span style={{
                flex: 1,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--text-950)",
                lineHeight: 1.4,
              }}>
                {item.text}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                <button
                  onClick={() => handleToggle(item)}
                  title={item.is_active ? "Desativar" : "Ativar"}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "none",
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {item.is_active
                    ? <Eye size={15} strokeWidth={1.8} style={{ color: "#10B981" }} />
                    : <EyeOff size={15} strokeWidth={1.8} style={{ color: "var(--text-300)" }} />
                  }
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  title="Remover"
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "none",
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <Trash2 size={14} strokeWidth={1.8} style={{ color: "var(--text-300)" }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 11,
            color: "var(--text-300)", marginTop: 14, textAlign: "center",
          }}>
            {activeCount} ativo(s) · Alterna automaticamente a cada 4 segundos no site
          </p>
        )}
      </div>
    </div>
  )
}
