// Shared building blocks for auth forms (customer ProfileModal + /acessoadmin) —
// one visual language for every login screen on the site.

export function IconEmail() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
export function IconLock() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

export function ErrorMsg({ error }: { error: string | null }) {
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

export function SuccessMsg({ success }: { success: string | null }) {
  if (!success) return null
  return (
    <div style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "11px 14px", marginBottom: 16 }}>
      <p style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 12.5, color: "#065F46", margin: 0 }}>{success}</p>
    </div>
  )
}

export function Field({
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
          aria-label={label}
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

export function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#B0A898" }}>
      {show ? <IconEyeOff /> : <IconEye />}
    </button>
  )
}

export function PrimaryBtn({ label, loading: l }: { label: string; loading: boolean }) {
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

export function BrandHeader({ title, subtitle, onClose }: { title?: string; subtitle?: string; onClose?: () => void }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1A1A1A 0%, #2D3D14 50%, #3D5018 100%)",
      padding: "22px 24px 18px",
      borderRadius: "24px 24px 0 0",
      position: "relative",
      display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center",
      flexShrink: 0,
    }}>
      <span style={{
        display: "inline-block",
        border: "1px solid rgba(200,155,60,0.5)",
        borderRadius: 100,
        padding: "3px 12px",
        fontSize: 11, fontWeight: 400,
        color: "rgba(255,255,255,0.5)",
        fontFamily: "var(--font-switzer), sans-serif",
        marginBottom: 8,
      }}>
        {subtitle ?? "Alimentação Saudável"}
      </span>
      <div style={{ fontFamily: "var(--font-switzer), sans-serif", fontWeight: 900, fontSize: 18, color: "#C89B3C", letterSpacing: "0.5px" }}>
        {title ?? "Donna FIT"}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14,
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
      )}
    </div>
  )
}
