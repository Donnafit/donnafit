"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"

type Announcement = Database["public"]["Tables"]["announcements"]["Row"]

interface Props {
  announcements: Announcement[]
}

export function AnunciosClient({ announcements: initial }: Props) {
  const [items, setItems] = useState<Announcement[]>(initial)
  const [newText, setNewText] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
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
      if (!res.ok) throw new Error((await res.json()).error)
      setNewText("")
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar")
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(item: Announcement) {
    setItems((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, is_active: !a.is_active } : a))
    )
    await fetch("/api/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    })
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id))
    await fetch("/api/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    startTransition(() => router.refresh())
  }

  return (
    <div className="p-4 md:p-6 text-white min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <Megaphone className="h-5 w-5 text-brand-gold" />
        <div>
          <h1 className="text-xl font-black">Avisos do Site</h1>
          <p className="text-xs text-gray-400 mt-0.5">Frases que aparecem na barra verde no topo do cardápio</p>
        </div>
      </div>

      {/* Adicionar novo */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-800">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Novo aviso</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Ex: Frete grátis acima de R$ 80 esta semana!"
            className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-brand-gold placeholder:text-gray-600"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newText.trim()}
            className="flex items-center gap-2 bg-brand-gold hover:opacity-90 disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-opacity shrink-0"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum aviso cadastrado. Adicione o primeiro acima.</p>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3 border transition-all ${
              item.is_active ? "border-gray-800" : "border-gray-800 opacity-50"
            }`}
          >
            <GripVertical className="h-4 w-4 text-gray-600 shrink-0" />

            <span className="flex-1 text-sm text-gray-200 leading-snug">
              {item.text}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {/* Toggle ativo/inativo */}
              <button
                onClick={() => handleToggle(item)}
                title={item.is_active ? "Desativar" : "Ativar"}
                className={`p-2 rounded-lg transition-colors ${
                  item.is_active
                    ? "text-green-400 hover:bg-green-400/10"
                    : "text-gray-500 hover:bg-gray-700"
                }`}
              >
                {item.is_active ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>

              {/* Deletar */}
              <button
                onClick={() => handleDelete(item.id)}
                title="Remover"
                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-gray-600 mt-4 text-center">
          {items.filter((a) => a.is_active).length} ativo(s) · Alterna automaticamente a cada 4 segundos no site
        </p>
      )}
    </div>
  )
}
