"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { formatCurrency } from "@/lib/utils"

type View = "login" | "register" | "forgot" | "profile" | "orders" | "editProfile"

interface OrderSummary {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  delivery_type: string
}

interface Props {
  open: boolean
  onClose: () => void
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Aguardando",  color: "#B87B10", bg: "#FFF3D4" },
  production: { label: "Preparando", color: "#1A56A0", bg: "#DBEAFE" },
  ready:      { label: "Pronto",     color: "#186A3B", bg: "#D1FAE5" },
  delivered:  { label: "Entregue",   color: "#555",    bg: "#F0F0F0" },
  cancelled:  { label: "Cancelado",  color: "#B91C1C", bg: "#FEE2E2" },
}

const AVATAR_COLORS = ["#5A6B2A", "#C89B3C", "#7B8E3D", "#8B6914", "#4A5B1A"]
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.toUpperCase().charCodeAt(0) ?? 65) % AVATAR_COLORS.length]
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : d
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

// ── Ícones SVG (module-level) ────────────────────────────────────────────────

function IconEmail() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}
function IconPerson() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function IconPhone() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}
function IconEye() {
  return (
    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

// ── Sub-components (module-level — evita remount a cada keystroke) ────────────

function ErrorMsg({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "11px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#B91C1C" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
        <path strokeLinecap="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12.5, color: "#B91C1C", margin: 0, lineHeight: 1.5 }}>{error}</p>
    </div>
  )
}

function SuccessMsg({ success }: { success: string | null }) {
  if (!success) return null
  return (
    <div style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "11px 14px", marginBottom: 16 }}>
      <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12.5, color: "#065F46", margin: 0 }}>{success}</p>
    </div>
  )
}

function Field({
  label, type = "text", value, onChange, placeholder, autoComplete, icon, rightEl,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  icon?: React.ReactNode
  rightEl?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        fontFamily: "var(--font-switzer), sans-serif", fontSize: 10.5, fontWeight: 700,
        color: "#5A6B2A", letterSpacing: "0.1em", textTransform: "uppercase",
        display: "block", marginBottom: 6,
      }}>
        {label}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <div style={{ position: "absolute", left: 13, color: "#B0A898", display: "flex", alignItems: "center", pointerEvents: "none" }}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            border: "1.5px solid #E8E3DA",
            borderRadius: 12,
            padding: icon
              ? (rightEl ? "13px 44px 13px 42px" : "13px 16px 13px 42px")
              : (rightEl ? "13px 44px 13px 16px" : "13px 16px"),
            fontSize: 14,
            outline: "none",
            background: "#FAFAF8",
            color: "#1A1A1A",
            fontFamily: "var(--font-switzer), sans-serif",
            boxSizing: "border-box",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#C89B3C"; e.currentTarget.style.background = "#fff" }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E8E3DA"; e.currentTarget.style.background = "#FAFAF8" }}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: 13, color: "#B0A898", display: "flex", alignItems: "center" }}>
            {rightEl}
          </div>
        )}
      </div>
    </div>
  )
}

function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#B0A898" }}>
      {show ? <IconEyeOff /> : <IconEye />}
    </button>
  )
}

function PrimaryBtn({ label, loading: l }: { label: string; loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={l}
      style={{
        width: "100%", padding: "15px",
        background: l ? "#9DB08A" : "linear-gradient(135deg, #5A6B2A 0%, #7B9238 100%)",
        color: "#fff", border: "none", borderRadius: 13,
        fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, fontSize: 15,
        cursor: l ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        marginTop: 6, boxShadow: l ? "none" : "0 6px 20px rgba(90,107,42,0.3)",
        transition: "all 0.2s", letterSpacing: "0.3px",
      }}
    >
      {l
        ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite" }} />
        : label
      }
    </button>
  )
}

function AuthTabs({ active, onSwitch }: { active: "login" | "register"; onSwitch: (v: "login" | "register") => void }) {
  return (
    <div style={{ display: "flex", background: "#F0EDE8", borderRadius: 12, padding: 3, margin: "0 24px 20px" }}>
      {(["login", "register"] as const).map((tab) => {
        const isActive = active === tab
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSwitch(tab)}
            style={{
              flex: 1, padding: "10px 8px",
              background: isActive ? "#5A6B2A" : "transparent",
              color: isActive ? "#fff" : "#888",
              border: "none", borderRadius: 10,
              fontFamily: "var(--font-switzer), sans-serif",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              transition: "all 0.22s ease",
              boxShadow: isActive ? "0 3px 10px rgba(90,107,42,0.25)" : "none",
            }}
          >
            {tab === "login" ? "Entrar" : "Cadastrar"}
          </button>
        )
      })}
    </div>
  )
}

function BrandHeader({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1A1A1A 0%, #2D3D14 50%, #3D5018 100%)",
      padding: "22px 24px 18px",
      borderRadius: "24px 24px 0 0",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 18, color: "#C89B3C", letterSpacing: "0.5px" }}>
          Donna FIT
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, fontFamily: "var(--font-switzer), sans-serif" }}>
          Alimentação Saudável
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          width: 32, height: 32, borderRadius: 10,
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", color: "rgba(255,255,255,0.7)",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)" }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function ModalHeader({ title, onClose, onBack }: { title: string; onClose: () => void; onBack?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 18px", borderBottom: "1px solid #F0EDE8", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, marginLeft: -6, borderRadius: 8, color: "#666", display: "flex" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <h2 style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 17, color: "#1A1A1A", margin: 0 }}>{title}</h2>
      </div>
      <button
        onClick={onClose}
        style={{ width: 34, height: 34, borderRadius: 10, background: "#F5F0E8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function MenuRow({ icon, label, sublabel, onClick, disabled = false }: {
  icon: React.ReactNode; label: string; sublabel?: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "13px 14px", background: "transparent", border: "none",
        borderRadius: 12, cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", gap: 14,
        transition: "background 0.15s", marginBottom: 4, opacity: disabled ? 0.5 : 1, textAlign: "left",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#F5F8F0" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F0F4E8", display: "flex", alignItems: "center", justifyContent: "center", color: "#5A6B2A", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 600, fontSize: 14, color: "#1A1A1A", margin: 0 }}>{label}</p>
        {sublabel && <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 11, color: "#AAA", margin: "2px 0 0" }}>{sublabel}</p>}
      </div>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#CCC" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ProfileModal({ open, onClose }: Props) {
  const { user, loading: authLoading } = useAuth()
  const [view, setView] = useState<View>("login")
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPass, setLoginPass] = useState("")
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [regName, setRegName] = useState("")
  const [regPhone, setRegPhone] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPass, setRegPass] = useState("")
  const [showRegPass, setShowRegPass] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)

  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    setError(null); setSuccess(null)
    if (!authLoading) setView(user ? "profile" : "login")
    return () => { document.body.style.overflow = "" }
  }, [open, user, authLoading])

  useEffect(() => {
    if (view === "orders" && user) loadOrders()
  }, [view, user])

  useEffect(() => {
    if (view === "editProfile" && user) {
      setEditName(user.user_metadata?.name ?? "")
      setEditPhone(formatPhone(user.user_metadata?.phone ?? ""))
      setEditAddress(user.user_metadata?.delivery_address ?? "")
      setEditError(null)
      setEditSuccess(null)
      setEditAvatarUrl(user.user_metadata?.avatar_url ?? null)
      setAvatarFile(null)
      setAvatarPreview(null)
    }
  }, [view, user])

  async function loadOrders() {
    if (!user) return
    setOrdersLoading(true)
    const supabase = createClient()
    const phone = user.user_metadata?.phone ?? ""
    const { data } = await (supabase.from("orders") as any)
      .select("id, order_number, status, total, created_at, delivery_type")
      .eq("customer_phone", phone.replace(/\D/g, ""))
      .order("created_at", { ascending: false })
      .limit(12)
    setOrders((data as OrderSummary[]) ?? [])
    setOrdersLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail || !loginPass) { setError("Preencha todos os campos."); return }
    setFormLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass })
    setFormLoading(false)
    if (err) { setError("E-mail ou senha incorretos."); return }
    try {
      const intent = localStorage.getItem("donna-fit-checkout-intent")
      if (intent) {
        localStorage.removeItem("donna-fit-checkout-intent")
        onClose()
        setTimeout(() => { window.location.href = "/checkout" }, 150)
        return
      }
    } catch {}
    setView("profile")
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regName || !regPhone || !regEmail || !regPass) { setError("Preencha todos os campos."); return }
    if (regPass.length < 6) { setError("Senha deve ter no mínimo 6 caracteres."); return }
    setFormLoading(true); setError(null)
    const supabase = createClient()
    const cleanPhone = regPhone.replace(/\D/g, "")
    const { error: err } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: { data: { name: regName, phone: cleanPhone } },
    })
    setFormLoading(false)
    if (err) { setError(err.message.includes("already") ? "Este e-mail já está cadastrado." : "Erro ao cadastrar. Tente novamente."); return }
    // Try to auto sign-in immediately (works if Supabase email confirmation is disabled)
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: regEmail,
      password: regPass,
    })
    if (!loginErr) {
      try {
        const intent = localStorage.getItem("donna-fit-checkout-intent")
        if (intent) {
          localStorage.removeItem("donna-fit-checkout-intent")
          onClose()
          setTimeout(() => { window.location.href = "/checkout" }, 150)
          return
        }
      } catch {}
      setView("profile")
    } else {
      setSuccess("Cadastro realizado! Verifique seu e-mail para confirmar.")
      setTimeout(() => setView("login"), 3000)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) { setError("Digite seu e-mail."); return }
    setFormLoading(true); setError(null)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(forgotEmail)
    setFormLoading(false)
    setForgotSent(true)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setView("login")
    setLoginEmail(""); setLoginPass("")
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setEditError("Imagem muito grande. Máximo 2MB.")
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) { setEditError("Informe seu nome."); return }
    setEditLoading(true); setEditError(null)
    const supabase = createClient()
    const cleanPhone = editPhone.replace(/\D/g, "")

    let newAvatarUrl = editAvatarUrl

    if (avatarFile && user) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg"
      const path = `${user.id}/avatar.${ext}`
      const supabaseClient = createClient()
      const { error: uploadErr } = await supabaseClient.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
      if (uploadErr) {
        setEditError("Erro ao enviar imagem. Tente novamente.")
        setEditLoading(false)
        return
      }
      const { data: urlData } = supabaseClient.storage.from("avatars").getPublicUrl(path)
      newAvatarUrl = urlData.publicUrl + "?t=" + Date.now()
    }

    const { error: err } = await supabase.auth.updateUser({
      data: { name: editName.trim(), phone: cleanPhone, avatar_url: newAvatarUrl, delivery_address: editAddress.trim() || undefined },
    })
    setEditLoading(false)
    if (err) { setEditError("Erro ao salvar. Tente novamente."); return }
    setEditSuccess("Perfil atualizado!")
    setTimeout(() => setView("profile"), 1500)
  }

  function switchView(v: "login" | "register") {
    setError(null); setSuccess(null); setView(v)
  }

  if (!open) return null

  const userName = user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "Usuário"
  const userInitial = userName.charAt(0).toUpperCase()
  const userPhone = user?.user_metadata?.phone ?? ""
  const avatarUrl = user?.user_metadata?.avatar_url ?? null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 180 }}>
      {/* Overlay */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(5px)", animation: "fadeIn 0.2s ease" }}
        onClick={onClose}
      />

      <div
        className="profile-modal"
        style={{ background: "#fff", display: "flex", flexDirection: "column", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── LOGIN ──────────────────────────────────────────────── */}
        {view === "login" && (
          <>
            <BrandHeader onClose={onClose} />
            <div style={{ overflowY: "auto" }}>
              <div style={{ padding: "20px 24px 4px" }}>
                <h2 style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 17, color: "#1A1A1A", margin: "0 0 4px" }}>
                  Bem-vindo de volta
                </h2>
                <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12.5, color: "#999", margin: "0 0 20px", lineHeight: 1.5 }}>
                  Acesse sua conta para acompanhar pedidos e preferências.
                </p>
              </div>
              <AuthTabs active="login" onSwitch={switchView} />
              <div style={{ padding: "0 24px 28px" }}>
                <ErrorMsg error={error} />
                <SuccessMsg success={success} />
                <form onSubmit={handleLogin}>
                  <Field label="E-mail" type="email" value={loginEmail} onChange={setLoginEmail}
                    placeholder="seu@email.com" autoComplete="email" icon={<IconEmail />} />
                  <Field
                    label="Senha" type={showLoginPass ? "text" : "password"}
                    value={loginPass} onChange={setLoginPass}
                    placeholder="••••••••" autoComplete="current-password"
                    icon={<IconLock />}
                    rightEl={<EyeBtn show={showLoginPass} toggle={() => setShowLoginPass(v => !v)} />}
                  />
                  <div style={{ textAlign: "right", marginTop: -6, marginBottom: 18 }}>
                    <button
                      type="button"
                      onClick={() => { setError(null); setView("forgot") }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#C89B3C", fontSize: 12, fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, padding: 0 }}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <PrimaryBtn label="Entrar" loading={formLoading} />
                </form>
              </div>
            </div>
          </>
        )}

        {/* ── CADASTRO ───────────────────────────────────────────── */}
        {view === "register" && (
          <>
            <BrandHeader onClose={onClose} />
            <div style={{ overflowY: "auto" }}>
              <div style={{ padding: "20px 24px 4px" }}>
                <h2 style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 17, color: "#1A1A1A", margin: "0 0 4px" }}>
                  Criar conta
                </h2>
                <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12.5, color: "#999", margin: "0 0 20px", lineHeight: 1.5 }}>
                  Acompanhe seus pedidos e facilite próximas compras.
                </p>
              </div>
              <AuthTabs active="register" onSwitch={switchView} />
              <div style={{ padding: "0 24px 28px" }}>
                <ErrorMsg error={error} />
                <SuccessMsg success={success} />
                <form onSubmit={handleRegister}>
                  <Field label="Nome completo" value={regName} onChange={setRegName}
                    placeholder="Maria da Silva" autoComplete="name" icon={<IconPerson />} />
                  <Field label="WhatsApp" value={regPhone}
                    onChange={(v) => setRegPhone(formatPhone(v))}
                    placeholder="(11) 99999-9999" autoComplete="tel" icon={<IconPhone />} />
                  <Field label="E-mail" type="email" value={regEmail} onChange={setRegEmail}
                    placeholder="seu@email.com" autoComplete="email" icon={<IconEmail />} />
                  <Field
                    label="Senha" type={showRegPass ? "text" : "password"}
                    value={regPass} onChange={setRegPass}
                    placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                    icon={<IconLock />}
                    rightEl={<EyeBtn show={showRegPass} toggle={() => setShowRegPass(v => !v)} />}
                  />
                  {regPass.length > 0 && (
                    <div style={{ marginTop: -6, marginBottom: 14 }}>
                      <div style={{ height: 3, borderRadius: 2, background: "#F0EDE8", overflow: "hidden", marginBottom: 5 }}>
                        <div style={{
                          height: "100%", borderRadius: 2,
                          width: regPass.length >= 10 ? "100%" : regPass.length >= 6 ? "60%" : "30%",
                          background: regPass.length >= 10 ? "#5A6B2A" : regPass.length >= 6 ? "#C89B3C" : "#E05252",
                          transition: "width 0.3s, background 0.3s",
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: regPass.length >= 6 ? "#5A6B2A" : "#E05252", fontFamily: "var(--font-switzer), sans-serif", fontWeight: 600 }}>
                        {regPass.length >= 10 ? "Senha forte" : regPass.length >= 6 ? "Senha boa" : "Senha fraca"}
                      </span>
                    </div>
                  )}
                  <PrimaryBtn label="Criar conta" loading={formLoading} />
                </form>
              </div>
            </div>
          </>
        )}

        {/* ── ESQUECI SENHA ──────────────────────────────────────── */}
        {view === "forgot" && (
          <>
            <ModalHeader title="Recuperar senha" onClose={onClose} onBack={() => setView("login")} />
            <div style={{ padding: "0 24px 28px", overflowY: "auto" }}>
              {forgotSent ? (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0F4E8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#5A6B2A" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 800, fontSize: 16, color: "#1A1A1A", marginBottom: 8 }}>E-mail enviado!</p>
                  <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 24 }}>
                    Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  </p>
                  <button
                    onClick={() => { setForgotSent(false); setView("login") }}
                    style={{ background: "linear-gradient(135deg, #5A6B2A, #7B9238)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(90,107,42,0.3)" }}
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.6, marginTop: 20 }}>
                    Digite seu e-mail e enviaremos um link para redefinir sua senha.
                  </p>
                  <ErrorMsg error={error} />
                  <form onSubmit={handleForgot}>
                    <Field label="E-mail" type="email" value={forgotEmail} onChange={setForgotEmail}
                      placeholder="seu@email.com" autoComplete="email" icon={<IconEmail />} />
                    <PrimaryBtn label="Enviar link de recuperação" loading={formLoading} />
                  </form>
                </>
              )}
            </div>
          </>
        )}

        {/* ── PERFIL ────────────────────────────────────────────── */}
        {view === "profile" && user && (
          <>
            <ModalHeader title="Minha Conta" onClose={onClose} />
            <div style={{ padding: "16px 24px 24px", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px", background: "linear-gradient(135deg, #F5F8F0, #EEF4E4)", borderRadius: 16, border: "1px solid #E0EAD0" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: avatarUrl ? "transparent" : avatarColor(userName),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  overflow: "hidden",
                }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  ) : (
                    <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 22, color: "#fff" }}>{userInitial}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, fontSize: 16, color: "#1A1A1A", margin: "0 0 3px" }}>{userName}</p>
                  <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12, color: "#5A6B2A", margin: 0, fontWeight: 500 }}>{user.email}</p>
                  {userPhone && (
                    <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 11, color: "#AAA", margin: "2px 0 0" }}>
                      {userPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                    </p>
                  )}
                </div>
              </div>

              <MenuRow
                icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                label="Meus Pedidos"
                sublabel="Histórico de compras"
                onClick={() => setView("orders")}
              />
              <MenuRow
                icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                label="Editar Perfil"
                sublabel="Nome, telefone e endereço"
                onClick={() => setView("editProfile")}
              />

              <div style={{ borderTop: "1px solid #F0EDE8", marginTop: 8, paddingTop: 8 }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%", padding: "12px 14px",
                    background: "none", border: "1.5px solid #FECACA", borderRadius: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    color: "#B91C1C", fontFamily: "var(--font-switzer), sans-serif", fontWeight: 600, fontSize: 14,
                    transition: "all 0.15s", marginTop: 4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sair da conta
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── PEDIDOS ───────────────────────────────────────────── */}
        {view === "orders" && (
          <>
            <ModalHeader title="Meus Pedidos" onClose={onClose} onBack={() => setView("profile")} />
            <div style={{ padding: "0 24px 24px", overflowY: "auto", flex: 1 }}>
              {ordersLoading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E5E0D8", borderTopColor: "#5A6B2A", animation: "spin 0.6s linear infinite" }} />
                </div>
              )}
              {!ordersLoading && orders.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F0EDE8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#AAA" strokeWidth={1.5}>
                      <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, fontSize: 15, color: "#1A1A1A", margin: "0 0 6px" }}>Nenhum pedido ainda</p>
                  <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 13, color: "#AAA" }}>Seus pedidos aparecerão aqui</p>
                </div>
              )}
              {!ordersLoading && orders.map((order) => {
                const st = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending
                return (
                  <div key={order.id} style={{ background: "#FAFAF8", borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: "1px solid #F0EDE8" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>Pedido #{order.order_number}</span>
                        <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 11, color: "#AAA", margin: "3px 0 0" }}>
                          {formatDate(order.created_at)} · {order.delivery_type === "delivery" ? "Delivery" : "Retirada"}
                        </p>
                      </div>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-switzer), sans-serif", whiteSpace: "nowrap" }}>
                        {st.label}
                      </span>
                    </div>
                    <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 15, color: "#C89B3C" }}>
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── EDITAR PERFIL ─────────────────────────────────────── */}
        {view === "editProfile" && user && (
          <>
            <ModalHeader title="Editar Perfil" onClose={onClose} onBack={() => setView("profile")} />
            <div style={{ padding: "20px 24px 28px", overflowY: "auto" }}>
              <ErrorMsg error={editError} />
              <SuccessMsg success={editSuccess} />
              <form onSubmit={handleEditProfile}>
                {/* Avatar upload */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
                  <div
                    onClick={() => document.getElementById("avatar-upload-input")?.click()}
                    style={{
                      width: 80, height: 80, borderRadius: "50%",
                      background: avatarPreview || editAvatarUrl ? "transparent" : avatarColor(editName || userName),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", position: "relative", overflow: "hidden",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      border: "3px solid #E8E3DA",
                    }}
                  >
                    {(avatarPreview || editAvatarUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview || editAvatarUrl || ""} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 28, color: "#fff" }}>
                        {(editName || userName).charAt(0).toUpperCase()}
                      </span>
                    )}
                    {/* Camera overlay */}
                    <div
                      style={{
                        position: "absolute", inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0" }}
                    >
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <input
                    id="avatar-upload-input"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleAvatarSelect}
                  />
                  <p style={{ fontSize: 11, color: "#AAA", marginTop: 8, fontFamily: "var(--font-switzer), sans-serif" }}>
                    Toque para alterar foto · max. 2MB
                  </p>
                </div>
                <Field
                  label="Nome completo"
                  value={editName}
                  onChange={setEditName}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  icon={<IconPerson />}
                />
                <Field
                  label="WhatsApp"
                  value={editPhone}
                  onChange={(v) => setEditPhone(formatPhone(v))}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  icon={<IconPhone />}
                />
                <Field
                  label="Endereço de entrega"
                  value={editAddress}
                  onChange={setEditAddress}
                  placeholder="Rua, número, bairro, cidade"
                  autoComplete="street-address"
                  icon={
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                <div style={{ marginTop: 8 }}>
                  <PrimaryBtn label="Salvar alterações" loading={editLoading} />
                </div>
              </form>
            </div>
          </>
        )}

        {/* ── LOADING ───────────────────────────────────────────── */}
        {authLoading && (
          <div style={{ padding: "56px 24px", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E5E0D8", borderTopColor: "#5A6B2A", animation: "spin 0.6s linear infinite" }} />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
