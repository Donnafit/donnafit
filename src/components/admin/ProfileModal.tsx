"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { User, Settings, LogOut, ChevronLeft, Camera, Sun, Moon, Megaphone, QrCode } from "lucide-react"
import Image from "next/image"

interface Props {
  name: string
  photo: string | null
  email?: string
  sidebarWidth?: number
  topAnchored?: boolean
  onSave: (name: string, photo: string | null) => void | Promise<void>
  onClose: () => void
  onLogout: () => void
}

function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])
  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
  }
  return { dark, toggle }
}

const MENU_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  width: "100%",
  padding: "9px 14px",
  borderRadius: 9,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(255,255,255,0.82)",
  textAlign: "left",
  transition: "background 120ms",
  textDecoration: "none",
}

export function ProfileModal({ name, photo, email = "", sidebarWidth = 232, topAnchored = false, onSave, onClose, onLogout }: Props) {
  const [view, setView] = useState<"menu" | "profile">("menu")
  const [localName, setLocalName] = useState(name)
  const [localPhoto, setLocalPhoto] = useState<string | null>(photo)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { dark, toggle: toggleDark } = useDarkMode()

  async function handleSave() {
    setSaving(true)
    await onSave(localName, localPhoto)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); setView("menu") }, 1800)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalPhoto(URL.createObjectURL(file))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
      />

      {/* Popover */}
      <div
        style={{
          position: "fixed",
          ...(topAnchored
            ? { top: 76, left: "50%", transform: "translateX(-50%)" }
            : { left: sidebarWidth + 12, bottom: 12 }),
          width: 256,
          maxWidth: "calc(100vw - 24px)",
          borderRadius: 14,
          background: "#1C2128",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          zIndex: 1000,
          overflow: "hidden",
          animation: "popIn 160ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {view === "menu" ? (
          <>
            {/* Header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {localPhoto
                  ? <Image src={localPhoto} alt="Perfil" width={36} height={36} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                  : <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 800, color: "#fff" }}>
                      {localName.charAt(0).toUpperCase()}
                    </span>
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                  {localName}
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  Administrador
                </p>
              </div>

              {/* Dark mode icon */}
              <button
                onClick={toggleDark}
                title={dark ? "Modo claro" : "Modo escuro"}
                style={{
                  marginLeft: "auto",
                  width: 30, height: 30,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                {dark
                  ? <Sun  size={13} strokeWidth={1.8} style={{ color: "var(--gold-500)" }} />
                  : <Moon size={13} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.45)" }} />
                }
              </button>
            </div>

            {/* Menu items */}
            <div style={{ padding: "6px 6px" }}>
              <button
                onClick={() => setView("profile")}
                style={MENU_STYLE}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <User size={15} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
                Perfil
              </button>

              <Link
                href="/admin/configuracoes"
                onClick={onClose}
                style={MENU_STYLE}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <Settings size={15} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
                Configurações
              </Link>

              {/* Anúncios/QR Code — só mobile; no desktop já tem no menu lateral */}
              <Link
                href="/admin/anuncios"
                onClick={onClose}
                className="admin-menu-mobile-only"
                style={{ ...MENU_STYLE, display: undefined }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <Megaphone size={15} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
                Anúncios
              </Link>

              <Link
                href="/admin/qrcode"
                onClick={onClose}
                className="admin-menu-mobile-only"
                style={{ ...MENU_STYLE, display: undefined }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <QrCode size={15} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
                QR Code
              </Link>
            </div>

            {/* Logout */}
            <div style={{ padding: "4px 6px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={onLogout}
                style={{ ...MENU_STYLE, color: "#F87171", marginTop: 2 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.08)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <LogOut size={15} strokeWidth={1.8} style={{ color: "#F87171", flexShrink: 0 }} />
                Sair
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Profile edit header */}
            <div style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <button
                onClick={() => setView("menu")}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={14} strokeWidth={2} style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                Editar perfil
              </p>
            </div>

            {/* Profile edit body */}
            <div style={{ padding: "16px 14px" }}>
              {/* Avatar upload */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    overflow: "hidden",
                    background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid rgba(255,255,255,0.1)",
                  }}>
                    {localPhoto
                      ? <Image src={localPhoto} alt="Foto" width={64} height={64} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                      : <span style={{ fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 800, color: "#fff" }}>
                          {localName.charAt(0).toUpperCase()}
                        </span>
                    }
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--gold-500)", border: "2px solid #1C2128",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={10} strokeWidth={2} style={{ color: "#fff" }} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
              </div>

              {/* Name field */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>
                  Nome
                </label>
                <input
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    fontFamily: "var(--font-ui)", fontSize: 13,
                    color: "#fff",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "9px 11px", outline: "none",
                  }}
                />
              </div>

              {/* Email field */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>
                  E-mail
                </label>
                <input
                  value={email}
                  readOnly
                  style={{
                    width: "100%", boxSizing: "border-box",
                    fontFamily: "var(--font-ui)", fontSize: 13,
                    color: "rgba(255,255,255,0.35)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8, padding: "9px 11px", outline: "none",
                    cursor: "not-allowed",
                  }}
                  disabled
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
                  padding: "10px 14px", borderRadius: 9,
                  background: saved ? "rgba(52,211,153,0.15)" : "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                  color: saved ? "#34D399" : "#fff",
                  border: saved ? "1px solid rgba(52,211,153,0.25)" : "none",
                  cursor: saving ? "wait" : "pointer", transition: "all 200ms",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translateX(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)  scale(1); }
        }
        @media (min-width: 768px) {
          .admin-menu-mobile-only { display: none; }
        }
      `}</style>
    </>
  )
}
