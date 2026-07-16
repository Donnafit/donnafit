"use client"
import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { Package, Search, CheckCircle2, AlertTriangle, XCircle, Minus, Plus,
  ChevronDown, Check, X, ImageIcon, PlusCircle, UploadCloud, Loader2, Edit3
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { resolveImageSrc } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ProductWithCat {
  id: string
  name: string
  sku: string | null
  description: string | null
  price: number
  category_id: string | null
  is_active: boolean
  stock_quantity: number
  min_stock_alert: number
  stock_type: "combo" | "avulso"
  rice_stock_mode: "none" | "integral" | "branco" | "both"
  rice_stock_integral: number | null
  rice_stock_branco: number | null
  image_url: string | null
  categories: { name: string; slug: string } | null
}

interface CategoryOption {
  id: string
  name: string
  slug: string
}

interface Props {
  products: ProductWithCat[]
}

// ─── Thumbnail (usa img nativo — Google Drive faz redirect 302) ───────────────
function ProductThumb({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return <Package size={16} strokeWidth={1.5} style={{ color: "var(--text-300)" }} />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolveImageSrc(src, 120)} alt={alt} onError={() => setBroken(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  )
}

// ─── Barra de estoque ─────────────────────────────────────────────────────────
function StockBar({ qty, min }: { qty: number; min: number }) {
  const max   = Math.max(qty, min * 3, 10)
  const pct   = Math.min((qty / max) * 100, 100)
  const color = qty === 0 ? "#EF4444" : qty <= min ? "#F59E0B" : "#10B981"
  return (
    <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--surface-200)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 300ms" }} />
    </div>
  )
}

// ─── Dropdown customizado (sem select nativo) ─────────────────────────────────
interface DropdownOption { value: string; label: string }
interface DropdownProps {
  value: string
  onChange: (v: string) => void
  options: DropdownOption[]
  placeholder?: string
  compact?: boolean
}

function CustomDropdown({ value, onChange, options, placeholder = "Selecionar", compact = false }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const current = options.find((o) => o.value === value)?.label ?? placeholder

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, textAlign: "left",
          fontFamily: "var(--font-ui)", fontSize: compact ? 12 : 13, fontWeight: 500,
          color: value ? "var(--text-950)" : "var(--text-300)",
          background: "var(--surface-50)",
          border: `1px solid ${open ? "rgba(200,155,60,0.6)" : "var(--surface-200)"}`,
          borderRadius: 9, padding: compact ? "0 12px" : "10px 12px",
          height: compact ? 40 : "auto",
          cursor: "pointer",
          transition: "border-color 150ms",
          boxSizing: "border-box",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current}</span>
        <ChevronDown size={compact ? 12 : 14} strokeWidth={2.5}
          style={{ color: "var(--gold-500)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 200,
          background: "var(--surface-100)",
          border: "1px solid var(--surface-200)",
          borderRadius: 10,
          boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
          overflow: "hidden",
          animation: "ddIn 120ms ease",
          maxHeight: 220, overflowY: "auto",
        }}>
          {options.map((opt) => {
            const sel = opt.value === value
            return (
              <button key={opt.value} type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: sel ? 700 : 400,
                  color: sel ? "var(--gold-500)" : "var(--text-700)",
                  background: sel ? "rgba(200,155,60,0.07)" : "transparent",
                  transition: "background 100ms",
                }}
                onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--surface-50)" }}
                onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent" }}
              >
                {opt.label}
                {sel && <Check size={12} strokeWidth={2.5} style={{ color: "var(--gold-500)", flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      )}
      <style>{`@keyframes ddIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button" onClick={onChange} role="switch" aria-checked={checked}
      style={{
        width: 44, height: 24, borderRadius: 99, border: "none",
        background: checked ? "#10B981" : "var(--surface-200)",
        position: "relative", cursor: "pointer", flexShrink: 0,
        transition: "background 200ms",
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 4, left: checked ? 23 : 4,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 200ms",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        display: "block",
      }} />
    </button>
  )
}

// ─── Upload de Imagem (Supabase Storage) ───────────────────────────────────────
export interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [urlError, setUrlError]   = useState(false)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) return
    setUploading(true)
    setUrlError(false)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await sb.storage.from("products-images").upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = sb.storage.from("products-images").getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      console.error(err)
      setUrlError(true)
    } finally {
      setUploading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (files && files[0]) uploadFile(files[0])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasImage = !!value && !urlError

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          position: "relative", borderRadius: 12, overflow: "hidden",
          height: hasImage ? 140 : 110,
          border: `2px dashed ${dragging ? "var(--gold-500)" : hasImage ? "transparent" : "var(--surface-200)"}`,
          background: dragging ? "rgba(200,155,60,0.06)" : hasImage ? "transparent" : "var(--surface-50)",
          cursor: uploading ? "wait" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "border-color 180ms, background 180ms",
        }}
      >
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Loader2 size={24} strokeWidth={1.5} style={{ color: "var(--gold-500)", animation: "spin 0.9s linear infinite" }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>Enviando imagem…</span>
          </div>
        ) : hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview"
              onError={() => setUrlError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {/* overlay ao hover */}
            <div className="img-overlay" style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: 0, transition: "opacity 180ms",
            }}>
              <UploadCloud size={20} style={{ color: "#fff" }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#fff", fontWeight: 600 }}>Trocar imagem</span>
            </div>
            <style>{`.img-overlay:hover{opacity:1!important}`}</style>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "var(--surface-200)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UploadCloud size={20} strokeWidth={1.5} style={{ color: "var(--text-300)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--text-700)" }}>
                Clique ou arraste a foto aqui
              </p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
                JPG, PNG, WebP · máx. 5MB
              </p>
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => handleFiles(e.target.files)} style={{ display: "none" }} />
      </div>



      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Modal de Produto (Criar / Editar) ──────────────────────────────────────────
interface ProductModalProps {
  onClose: () => void
  onSaved: (product: ProductWithCat) => void
  productToEdit?: ProductWithCat | null
}

function ProductModal({ onClose, onSaved, productToEdit }: ProductModalProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    name: productToEdit?.name ?? "",
    description: productToEdit?.description ?? "",
    sku: productToEdit?.sku ?? "",
    price: productToEdit?.price?.toString() ?? "",
    image_url: productToEdit?.image_url ?? "",
    category_id: productToEdit?.category_id ?? "",
    stock_type: productToEdit?.stock_type ?? "combo",
    stock_quantity: productToEdit?.stock_quantity?.toString() ?? "0",
    min_stock_alert: productToEdit?.min_stock_alert?.toString() ?? "10",
    is_active: productToEdit?.is_active ?? true,
    rice_stock_mode: productToEdit?.rice_stock_mode ?? "none",
    rice_stock_integral: productToEdit?.rice_stock_integral?.toString() ?? "0",
    rice_stock_branco: productToEdit?.rice_stock_branco?.toString() ?? "0",
  })

  useEffect(() => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from("categories").select("id,name,slug").order("sort_order")
      .then(({ data }: { data: CategoryOption[] | null }) => { if (data) setCategories(data) })
  }, [])

  // Bloqueia scroll do body ao abrir modal
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  const catOptions: DropdownOption[] = [
    { value: "", label: "Sem categoria" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  const typeOptions: DropdownOption[] = [
    { value: "combo",  label: "Combo — reserva no checkout" },
    { value: "avulso", label: "Avulso — baixa na produção" },
  ]

  const riceStockModeOptions: DropdownOption[] = [
    { value: "none",     label: "Sem arroz" },
    { value: "integral", label: "Só arroz integral" },
    { value: "branco",   label: "Só arroz branco" },
    { value: "both",     label: "Ambos — estoque separado" },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return setError("O nome do produto é obrigatório.")
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      return setError("Informe um preço válido maior que zero.")

    setSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const isRiceSplit = form.rice_stock_mode === "both"
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sku: form.sku.trim().toUpperCase() || null,
      price: Number(Number(form.price).toFixed(2)),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id || null,
      stock_type: form.stock_type,
      stock_quantity: isRiceSplit ? 0 : Math.max(0, parseInt(form.stock_quantity) || 0),
      min_stock_alert: Math.max(1, parseInt(form.min_stock_alert) || 10),
      is_active: form.is_active,
      rice_stock_mode: form.rice_stock_mode,
      rice_stock_integral: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_integral) || 0) : null,
      rice_stock_branco: isRiceSplit ? Math.max(0, parseInt(form.rice_stock_branco) || 0) : null,
      // false só quando "branco" (força Branco no checkout, igual já
      // funciona hoje); nos outros 3 modos o checkout continua livre
      // pra oferecer as duas opções — "só integral" não tem como travar
      // a escolha do lado do cliente hoje (não existe esse conceito na
      // modal de arroz), então é uma responsabilidade do cadastro, não
      // do código: ver nota abaixo.
      rice_integral_available: form.rice_stock_mode !== "branco",
    }

    let query = sb.from("products")
    if (productToEdit) {
      query = query.update(payload).eq("id", productToEdit.id)
    } else {
      query = query.insert({ ...payload, sort_order: 999 })
    }

    const { data, error: saveError } = await query.select("*, categories(name, slug)").single()

    if (saveError) {
      setError(saveError.message ?? "Erro ao salvar. Tente novamente.")
      setSaving(false)
      return
    }
    onSaved(data as ProductWithCat)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", fontFamily: "var(--font-ui)", fontSize: 13,
    color: "var(--text-950)", background: "var(--surface-50)",
    border: "1px solid var(--surface-200)", borderRadius: 9,
    padding: "10px 12px", outline: "none", boxSizing: "border-box",
    transition: "border-color 150ms",
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
    color: "var(--text-300)", letterSpacing: "0.5px", textTransform: "uppercase",
    display: "block", marginBottom: 5,
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        padding: 16, boxSizing: "border-box",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "var(--surface-100)",
        borderRadius: 18, width: "100%", maxWidth: 560,
        maxHeight: "calc(100vh - 32px)", overflowY: "auto",
        boxShadow: "0 28px 72px rgba(0,0,0,0.32)",
        animation: "fadeUp 180ms ease",
      }}>
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
          .modal-input:focus{border-color:rgba(200,155,60,0.6)!important}
        `}</style>

        {/* Header */}
        <div className="px-4 sm:px-6" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 20, paddingBottom: 20, borderBottom: "1px solid var(--surface-200)",
          position: "sticky", top: 0, background: "var(--surface-100)", zIndex: 1,
          borderRadius: "18px 18px 0 0",
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 800, color: "var(--text-950)" }}>
              {productToEdit ? "Editar Produto" : "Novo Produto"}
            </p>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
              {productToEdit ? "Edite os detalhes do produto abaixo" : "Preencha os dados para adicionar ao cardápio"}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9, border: "none",
            background: "var(--surface-200)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={14} strokeWidth={2.5} style={{ color: "var(--text-700)" }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-6" style={{ paddingTop: 22, paddingBottom: 22, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Foto */}
          <div>
            <label style={labelStyle}>Foto do Produto</label>
            <ImageUploader value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} />
          </div>

          <div style={{ borderTop: "1px solid var(--surface-200)" }} />

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome do Produto *</label>
            <input className="modal-input" style={inputStyle}
              placeholder="Ex: Frango Grelhado com Arroz Integral (350g)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required />
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <textarea className="modal-input" style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
              placeholder="Ingredientes, informações nutricionais, modo de preparo…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Preço + SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            <div>
              <label style={labelStyle}>Preço (R$) *</label>
              <input type="number" step="0.01" min="0"
                className="modal-input" style={inputStyle}
                placeholder="0,00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required />
            </div>
            <div>
              <label style={labelStyle}>SKU</label>
              <input className="modal-input" style={inputStyle}
                placeholder="Ex: FRG-GRELHADO-350"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
          </div>

          {/* Categoria + Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            <div>
              <label style={labelStyle}>Categoria</label>
              <CustomDropdown
                value={form.category_id}
                onChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
                options={catOptions}
                placeholder="Sem categoria"
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo de Estoque</label>
              <CustomDropdown
                value={form.stock_type}
                onChange={(v) => setForm((f) => ({ ...f, stock_type: v as "combo" | "avulso" }))}
                options={typeOptions}
              />
            </div>
          </div>

          {/* Estoque de Arroz — específico pra esse par de tipos, não é
              um sistema de variação genérico */}
          <div>
            <label style={labelStyle}>Estoque de Arroz</label>
            <CustomDropdown
              value={form.rice_stock_mode}
              onChange={(v) => setForm((f) => ({ ...f, rice_stock_mode: v as typeof f.rice_stock_mode }))}
              options={riceStockModeOptions}
            />
          </div>

          {/* Estoque Inicial + Alerta — os 2 campos de arroz substituem
              o Estoque Inicial quando rice_stock_mode === "both" */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            {form.rice_stock_mode === "both" ? (
              <>
                <div>
                  <label style={labelStyle}>Estoque — Arroz Integral</label>
                  <input type="number" min="0" className="modal-input" style={inputStyle}
                    value={form.rice_stock_integral}
                    onChange={(e) => setForm((f) => ({ ...f, rice_stock_integral: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Estoque — Arroz Branco</label>
                  <input type="number" min="0" className="modal-input" style={inputStyle}
                    value={form.rice_stock_branco}
                    onChange={(e) => setForm((f) => ({ ...f, rice_stock_branco: e.target.value }))} />
                </div>
              </>
            ) : (
              <div>
                <label style={labelStyle}>Estoque Inicial</label>
                <input type="number" min="0" className="modal-input" style={inputStyle}
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Alerta de Baixo Estoque</label>
              <input type="number" min="1" className="modal-input" style={inputStyle}
                value={form.min_stock_alert}
                onChange={(e) => setForm((f) => ({ ...f, min_stock_alert: e.target.value }))} />
            </div>
          </div>

          {/* Ativo */}
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <Toggle checked={form.is_active} onChange={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} />
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)" }}>
                Produto ativo
              </p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 1 }}>
                {form.is_active ? "Visível no cardápio" : "Oculto no cardápio"}
              </p>
            </div>
          </label>

          {/* Erro */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 9, padding: "10px 14px",
              fontFamily: "var(--font-ui)", fontSize: 12, color: "#EF4444",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <XCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Ações */}
          <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "12px", minHeight: 44, borderRadius: 10,
              border: "1px solid var(--surface-200)",
              background: "transparent", cursor: "pointer",
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
              color: "var(--text-700)", transition: "border-color 150ms",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-500)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--surface-200)" }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: "12px", minHeight: 44, borderRadius: 10, border: "none",
              background: saving ? "var(--surface-200)" : "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
              /* ✅ Letra BRANCA em fundos dourados */
              color: saving ? "var(--text-300)" : "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 200ms",
              boxShadow: saving ? "none" : "0 4px 14px rgba(200,155,60,0.35)",
            }}>
              {saving ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
                  Salvando…
                </>
              ) : (
                <>
                  <PlusCircle size={14} strokeWidth={2.5} />
                  {productToEdit ? "Salvar Alterações" : "Adicionar ao Cardápio"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function EstoqueClient({ products: initial }: Props) {
  const [products,   setProducts]   = useState<ProductWithCat[]>(initial)
  const [search,     setSearch]     = useState("")
  const [catFilter,  setCatFilter]  = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [saving,     setSaving]     = useState<Record<string, boolean>>({})
  const [saved,      setSaved]      = useState<Record<string, boolean>>({})
  const [showModal,  setShowModal]  = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithCat | null>(null)
  const [, startTransition] = useTransition()

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
    const matchCat    = catFilter  === "all" || (p.categories?.slug ?? "") === catFilter
    const matchType   = typeFilter === "all" || p.stock_type === typeFilter
    return matchSearch && matchCat && matchType
  })

  // Categorias únicas para filtro
  const catOptions: DropdownOption[] = [
    { value: "all", label: "Todas categorias" },
    ...Array.from(
      new Map(products.map((p) => [p.categories?.slug ?? "__", p.categories?.name ?? "Sem categoria"])).entries()
    ).map(([slug, name]) => ({ value: slug, label: name })),
  ]
  const typeOptions: DropdownOption[] = [
    { value: "all",    label: "Todos os tipos" },
    { value: "combo",  label: "Combos" },
    { value: "avulso", label: "Avulsos" },
  ]

  const total      = products.length
  const okCount    = products.filter((p) => p.stock_quantity > p.min_stock_alert).length
  const lowCount   = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length
  const emptyCount = products.filter((p) => p.stock_quantity === 0).length

  async function adjustQty(product: ProductWithCat, delta: number) {
    const newQty = Math.max(0, product.stock_quantity + delta)
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock_quantity: newQty } : p)))
    setSaving((prev) => ({ ...prev, [product.id]: true }))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)("adjust_stock", {
      p_product_id: product.id,
      p_new_quantity: newQty,
      p_notes: "Ajuste manual — painel admin",
    })
    setSaving((prev) => ({ ...prev, [product.id]: false }))
    setSaved((prev) => ({ ...prev, [product.id]: true }))
    startTransition(() => {
      setTimeout(() => setSaved((prev) => ({ ...prev, [product.id]: false })), 1500)
    })
  }

  const metrics = [
    { label: "Total",         value: total,      Icon: Package,       accent: "var(--text-300)",  dim: "var(--surface-200)" },
    { label: "Em estoque",    value: okCount,    Icon: CheckCircle2,  accent: "#10B981",           dim: "rgba(16,185,129,0.1)" },
    { label: "Estoque baixo", value: lowCount,   Icon: AlertTriangle, accent: "#F59E0B",           dim: "rgba(245,158,11,0.1)" },
    { label: "Esgotado",      value: emptyCount, Icon: XCircle,       accent: "#EF4444",           dim: "rgba(239,68,68,0.1)" },
  ]

  return (
    <>
      <div style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--surface-50)" }}>

        {/* Header */}
        <div
          className="flex-wrap gap-3 px-4 sm:px-7"
          style={{
            background: "var(--surface-100)", borderBottom: "1px solid var(--surface-200)",
            paddingTop: 18, paddingBottom: 18,
            position: "sticky", top: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 800, color: "var(--text-950)" }}>
              Controle de Estoque
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
              {total} produto{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
            </p>
          </div>
          {/* ✅ Botão "Novo Produto" — letra branca */}
          <button
            onClick={() => { setEditingProduct(null); setShowModal(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
              border: "none", borderRadius: 10, padding: "0 18px", height: 38,
              cursor: "pointer", flexShrink: 0,
              fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
              color: "#FFFFFF", /* ✅ branco para contraste */
              boxShadow: "0 4px 14px rgba(200,155,60,0.3)",
              transition: "opacity 200ms, transform 200ms, box-shadow 200ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.88"
              e.currentTarget.style.transform = "translateY(-1px)"
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(200,155,60,0.45)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1"
              e.currentTarget.style.transform = "none"
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(200,155,60,0.3)"
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Novo Produto
          </button>
        </div>

        <div className="px-4 sm:px-7" style={{ paddingTop: 22, paddingBottom: 22 }}>
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, marginBottom: 20 }}>
            {metrics.map(({ label, value, Icon, accent, dim }) => (
              <div key={label} style={{
                background: "var(--surface-100)", border: "1px solid var(--surface-200)",
                borderRadius: 14, padding: "18px 20px", minWidth: 0,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: dim,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <Icon size={16} strokeWidth={1.8} style={{ color: accent }} />
                </div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 28, fontWeight: 900, color: "var(--text-950)", lineHeight: 1 }}>
                  {value}
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Busca + filtros */}
          <div className="flex flex-col sm:flex-row" style={{ gap: 8, marginBottom: 14 }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              background: "var(--surface-100)", border: "1px solid var(--surface-200)",
              borderRadius: 9, padding: "0 12px", minWidth: 0,
            }}>
              <Search size={13} strokeWidth={1.8} style={{ color: "var(--text-300)", flexShrink: 0 }} />
              <input
                type="text" placeholder="Buscar por nome ou SKU…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, fontFamily: "var(--font-ui)", fontSize: 13,
                  color: "var(--text-950)", background: "transparent",
                  border: "none", outline: "none", padding: "10px 0",
                }}
              />
            </div>
            <div className="grid grid-cols-2 sm:contents" style={{ gap: 8 }}>
              <div className="sm:w-[180px]">
                <CustomDropdown value={catFilter} onChange={setCatFilter} options={catOptions} compact />
              </div>
              <div className="sm:w-[150px]">
                <CustomDropdown value={typeFilter} onChange={setTypeFilter} options={typeOptions} compact />
              </div>
            </div>
          </div>

          {filtered.length !== products.length && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginBottom: 10 }}>
              Exibindo {filtered.length} de {total} produtos
            </p>
          )}

          {/* Linhas de produtos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((product) => {
              const qty      = product.stock_quantity
              const isEmpty  = qty === 0
              const isLow    = !isEmpty && qty <= product.min_stock_alert
              const pill     = isEmpty
                ? { bg: "rgba(239,68,68,0.08)", color: "#EF4444", label: "Esgotado" }
                : isLow
                ? { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", label: "Baixo" }
                : { bg: "rgba(16,185,129,0.08)", color: "#10B981", label: "OK" }
              const isSaving = saving[product.id]
              const isSaved  = saved[product.id]

              const editButton = (
                <button
                  onClick={() => setEditingProduct(product)}
                  aria-label={`Editar ${product.name}`}
                  style={{
                    width: 28, height: 28, background: "transparent", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-300)", flexShrink: 0, transition: "color 150ms",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--gold-500)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-300)"}
                >
                  <Edit3 size={14} strokeWidth={2} />
                </button>
              )

              const stepper = (
                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => adjustQty(product, -1)}
                    disabled={qty === 0 || isSaving}
                    aria-label={`Diminuir estoque de ${product.name}`}
                    style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: "var(--surface-200)", border: "none",
                      cursor: qty === 0 || isSaving ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: qty === 0 || isSaving ? 0.35 : 1, transition: "opacity 200ms",
                    }}
                  >
                    <Minus size={14} strokeWidth={2.5} style={{ color: "var(--text-700)" }} />
                  </button>

                  <span style={{
                    fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 900,
                    color: isSaved ? "#10B981" : "var(--text-950)",
                    width: 32, textAlign: "center", transition: "color 200ms",
                  }}>
                    {isSaving ? "…" : isSaved ? "✓" : qty}
                  </span>

                  <button
                    onClick={() => adjustQty(product, 1)}
                    disabled={isSaving}
                    aria-label={`Aumentar estoque de ${product.name}`}
                    style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                      border: "none", cursor: isSaving ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: isSaving ? 0.4 : 1, transition: "opacity 200ms",
                    }}
                  >
                    <Plus size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
                  </button>
                </div>
              )

              const thumbnail = (
                <div style={{
                  width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0,
                  background: "var(--surface-200)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ProductThumb src={product.image_url} alt={product.name} />
                </div>
              )

              const statusPill = (
                <span style={{
                  fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 99,
                  background: pill.bg, color: pill.color, flexShrink: 0,
                }}>
                  {pill.label}
                </span>
              )

              const comboTag = product.stock_type === "combo" && (
                <span style={{
                  fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700,
                  padding: "2px 7px", borderRadius: 99,
                  background: "rgba(200,155,60,0.10)", color: "var(--gold-500)",
                  textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0,
                }}>
                  Combo
                </span>
              )

              return (
                <div key={product.id} style={{
                  background: "var(--surface-100)",
                  border: `1px solid ${isEmpty ? "rgba(239,68,68,0.2)" : isLow ? "rgba(245,158,11,0.2)" : "var(--surface-200)"}`,
                  borderRadius: 12,
                  transition: "border-color 200ms",
                }}>
                  {/* ── Desktop: uma linha só ─────────────────────────── */}
                  <div className="hidden md:flex" style={{ padding: "14px 18px", alignItems: "center", gap: 14 }}>
                    {thumbnail}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <p style={{
                          fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)", lineHeight: 1.2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          flex: "0 1 auto", minWidth: "60px", maxWidth: "70%",
                        }}>
                          {product.name}
                        </p>
                        {statusPill}
                        {comboTag}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StockBar qty={qty} min={product.min_stock_alert} />
                        {product.sku && (
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-300)", flexShrink: 0 }}>
                            {product.sku}
                          </span>
                        )}
                        {editButton}
                      </div>
                    </div>

                    {stepper}
                  </div>

                  {/* ── Mobile: duas linhas ───────────────────────────── */}
                  <div className="flex md:hidden" style={{ flexDirection: "column", padding: "12px 14px", gap: 10 }}>
                    {/* Linha 1: status + barra de estoque esticada + editar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {statusPill}
                      {comboTag}
                      <StockBar qty={qty} min={product.min_stock_alert} />
                      {editButton}
                    </div>

                    {/* Linha 2: foto + nome/código + stepper */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {thumbnail}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)", lineHeight: 1.25,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {product.name}
                        </p>
                        {product.sku && (
                          <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-300)", marginTop: 2 }}>
                            {product.sku}
                          </p>
                        )}
                      </div>
                      {stepper}
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{
                background: "var(--surface-100)", border: "1px solid var(--surface-200)",
                borderRadius: 14, padding: "48px 24px", textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <Package size={28} strokeWidth={1.5} style={{ color: "var(--text-300)", opacity: 0.5 }} />
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-300)" }}>
                  Nenhum produto encontrado.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(showModal || editingProduct) && (
        <ProductModal
          productToEdit={editingProduct}
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
          onSaved={(product) => {
            if (editingProduct) {
              setProducts((prev) => prev.map((p) => p.id === product.id ? product : p))
            } else {
              setProducts((prev) => [product, ...prev])
            }
          }}
        />
      )}
    </>
  )
}
