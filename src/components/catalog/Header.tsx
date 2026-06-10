"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/hooks/useCart"
import { useAuth } from "@/hooks/useAuth"
import { SearchModal } from "@/components/ui/SearchModal"
import { CartDrawer } from "@/components/ui/CartDrawer"
import { ProfileModal } from "@/components/ui/ProfileModal"

const NAV_ITEMS = [
  { label: "Combos",   slug: "combos" },
  { label: "Marmitas", slug: "frango" },
  { label: "Massas",   slug: "massas" },
  { label: "Sopas",    slug: "sopas-e-caldos" },
]

const AVATAR_COLORS = ["#5A6B2A", "#C89B3C", "#7B8E3D", "#8B6914", "#4A5B1A"]
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.toUpperCase().charCodeAt(0) ?? 65) % AVATAR_COLORS.length]
}

interface Props {
  activeCategory?: string | null
}

export function Header({ activeCategory }: Props) {
  const router = useRouter()
  const { count } = useCart()
  const { user } = useAuth()

  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function handleOpenCart() { setCartOpen(true) }
    window.addEventListener('openCartDrawer', handleOpenCart)
    return () => window.removeEventListener('openCartDrawer', handleOpenCart)
  }, [])

  useEffect(() => {
    function handleOpenProfile() { setProfileOpen(true) }
    window.addEventListener('openProfileModal', handleOpenProfile)
    return () => window.removeEventListener('openProfileModal', handleOpenProfile)
  }, [])

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8) }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const cartCount = mounted ? count() : 0
  const userName = user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? ""
  const userInitial = userName.charAt(0).toUpperCase()

  function handleNav(slug: string) {
    router.push(`/?cat=${slug}`, { scroll: false })
    setMobileOpen(false)
    setTimeout(() => {
      document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })
    }, 120)
  }

  const LogoCircle = ({ size = 40 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: "2px solid #C89B3C", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#FFFDF8", flexShrink: 0,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Donna FIT" style={{ width: size * 0.8, height: size * 0.8, objectFit: "contain" }} />
    </div>
  )

  const IconBtn = ({
    onClick, label, children, badge,
  }: {
    onClick: () => void
    label: string
    children: React.ReactNode
    badge?: number
  }) => (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 40, height: 40, borderRadius: 10,
        border: "none", background: "transparent",
        cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        position: "relative", padding: 0, flexShrink: 0,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F0E8" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
    >
      {children}
      {badge != null && badge > 0 && (
        <span style={{
          position: "absolute", top: 2, right: 2,
          width: 18, height: 18, background: "#C89B3C",
          color: "#fff", borderRadius: "50%",
          fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, pointerEvents: "none",
        }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  )

  return (
    <>
      <header style={{
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.72)" : "#FFFFFF",
        backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.35)" : "1px solid #F0EDE8",
        transition: "background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 20px", height: "100%",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
        }}>

          {/* ── LEFT ──────────────────────────────── */}

          {/* Desktop: Logo + Brand */}
          <button
            onClick={() => router.push("/")}
            className="hidden md:flex"
            style={{ alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <LogoCircle size={40} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 16, color: "#1A1A1A", lineHeight: 1.15 }}>
                Donna FIT
              </div>
              <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 9, fontWeight: 600, color: "#5A6B2A", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Alimentação Saudável
              </div>
            </div>
          </button>

          {/* Mobile: Hamburger */}
          <button
            className="flex md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: 0, flexShrink: 0 }}
          >
            <span style={{ display: "block", width: 20, height: 2, background: "#5A6B2A", borderRadius: 2 }} />
            <span style={{ display: "block", width: 14, height: 2, background: "#5A6B2A", borderRadius: 2 }} />
            <span style={{ display: "block", width: 20, height: 2, background: "#5A6B2A", borderRadius: 2 }} />
          </button>

          {/* ── CENTER ────────────────────────────── */}

          {/* Desktop: Nav links */}
          <nav className="hidden md:flex" style={{ gap: 2, alignItems: "center", flex: 1, justifyContent: "center" }}>
            {NAV_ITEMS.map((item) => {
              const isActive = activeCategory === item.slug
              return (
                <button
                  key={item.slug}
                  onClick={() => handleNav(item.slug)}
                  style={{
                    fontFamily: "var(--font-switzer), sans-serif",
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#5A6B2A" : "#666",
                    background: isActive ? "#EFF4E6" : "transparent",
                    border: "none", cursor: "pointer",
                    padding: "7px 18px", borderRadius: 20,
                    transition: "all 0.18s ease",
                    letterSpacing: "0.015em", whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#5A6B2A"
                      e.currentTarget.style.background = "#F5F8F0"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#666"
                      e.currentTarget.style.background = "transparent"
                    }
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Mobile: Logo centralizada */}
          <button
            className="flex md:hidden"
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}
          >
            <LogoCircle size={40} />
          </button>

          {/* ── RIGHT: Search + Cart + Profile ──── */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>

            {/* Search — desktop only */}
            <span className="hidden md:flex">
              <IconBtn onClick={() => setSearchOpen(true)} label="Buscar">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#5A6B2A" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
              </IconBtn>
            </span>

            {/* Cart — always visible */}
            <IconBtn onClick={() => setCartOpen(true)} label="Carrinho" badge={cartCount}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#5A6B2A" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </IconBtn>

            {/* Profile — desktop only */}
            <span className="hidden md:flex">
              <button
                onClick={() => setProfileOpen(true)}
                aria-label="Perfil"
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: user ? "2px solid #C89B3C" : "2px solid #E5E0D8",
                  background: user ? avatarColor(userName) : "#F5F0E8",
                  cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.2s ease",
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#5A6B2A"
                  e.currentTarget.style.transform = "scale(1.05)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = user ? "#C89B3C" : "#E5E0D8"
                  e.currentTarget.style.transform = "scale(1)"
                }}
              >
                {user && userInitial ? (
                  <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 15, color: "#fff", lineHeight: 1 }}>
                    {userInitial}
                  </span>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#999" strokeWidth={1.8}>
                    <path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>
            </span>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ──────────────────────────────── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setMobileOpen(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", animation: "fadeIn 0.22s ease" }} />
          <div
            style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              width: 280, background: "#fff",
              boxShadow: "6px 0 40px rgba(0,0,0,0.14)",
              display: "flex", flexDirection: "column",
              animation: "drawerSlideIn 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #F0EDE8" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #C89B3C", overflow: "hidden", background: "#FFFDF8" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.svg" alt="Donna FIT" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 15, color: "#1A1A1A" }}>Donna FIT</div>
                  <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 9, fontWeight: 600, color: "#5A6B2A", letterSpacing: "0.12em", textTransform: "uppercase" }}>Alimentação Saudável</div>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, color: "#AAA", display: "flex" }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, padding: "20px 12px", display: "flex", flexDirection: "column" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#C0B8B0", letterSpacing: "0.12em", padding: "0 10px 12px", fontFamily: "var(--font-switzer), sans-serif", textTransform: "uppercase" }}>
                Categorias
              </p>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => handleNav(item.slug)}
                  style={{
                    width: "100%", textAlign: "left",
                    fontFamily: "var(--font-switzer), sans-serif",
                    fontSize: 15, fontWeight: 600,
                    color: activeCategory === item.slug ? "#5A6B2A" : "#1A1A1A",
                    background: activeCategory === item.slug ? "#EFF4E6" : "transparent",
                    border: "none", cursor: "pointer",
                    padding: "13px 12px", borderRadius: 10,
                    display: "block", transition: "background 0.15s ease",
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </button>
              ))}

              {/* Divider */}
              <div style={{ height: 1, background: "#F0EDE8", margin: "12px 0" }} />

              {/* Buscar */}
              <button
                onClick={() => { setMobileOpen(false); setTimeout(() => setSearchOpen(true), 80) }}
                style={{
                  width: "100%", textAlign: "left",
                  fontFamily: "var(--font-switzer), sans-serif",
                  fontSize: 15, fontWeight: 600, color: "#1A1A1A",
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "13px 12px", borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "background 0.15s ease", marginBottom: 2,
                }}
                onTouchStart={(e) => { e.currentTarget.style.background = "#F5F8F0" }}
                onTouchEnd={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#5A6B2A" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
                Buscar produtos
              </button>

              {/* Minha conta */}
              <button
                onClick={() => { setMobileOpen(false); setTimeout(() => setProfileOpen(true), 80) }}
                style={{
                  width: "100%", textAlign: "left",
                  fontFamily: "var(--font-switzer), sans-serif",
                  fontSize: 15, fontWeight: 600, color: "#1A1A1A",
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "13px 12px", borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "background 0.15s ease",
                }}
                onTouchStart={(e) => { e.currentTarget.style.background = "#F5F8F0" }}
                onTouchEnd={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                {user && userInitial ? (
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: avatarColor(userName),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 12, color: "#fff" }}>{userInitial}</span>
                  </span>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#5A6B2A" strokeWidth={2}>
                    <path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {user ? userName || "Minha conta" : "Minha conta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────── */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer  open={cartOpen}   onClose={() => setCartOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
