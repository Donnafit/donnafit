"use client"
import { AlertTriangle } from "lucide-react"

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,12,7,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 340,
          boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: danger ? "rgba(220,38,38,0.1)" : "var(--gold-dim, rgba(200,155,60,0.12))",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <AlertTriangle size={18} strokeWidth={2} style={{ color: danger ? "#DC2626" : "var(--gold-500)" }} />
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 700, color: "var(--text-950)", marginBottom: 6 }}>
          {title}
        </p>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-500)", lineHeight: 1.5, marginBottom: 20 }}>
          {description}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
              padding: "10px 16px", minHeight: 44, borderRadius: 10,
              background: "var(--surface-50)", color: "var(--text-700)",
              border: "1px solid var(--surface-200)", cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
              padding: "10px 16px", minHeight: 44, borderRadius: 10, border: "none", cursor: "pointer",
              background: danger ? "#DC2626" : "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
              color: "#fff",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
