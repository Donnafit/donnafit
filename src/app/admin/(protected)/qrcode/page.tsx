"use client"
import dynamic from "next/dynamic"
import { QrCode, Printer } from "lucide-react"

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://donnafit.com.br"

export default function QRCodePage() {
  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, background: "var(--surface-50)" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--surface-100)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36, height: 36,
            borderRadius: 9,
            background: "var(--gold-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <QrCode size={16} strokeWidth={1.8} style={{ color: "var(--gold-500)" }} />
        </div>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text-950)",
              lineHeight: 1.2,
            }}
          >
            QR Code para Rótulos
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-300)", marginTop: 2 }}>
            Imprima e cole nos rótulos das marmitas
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 480,
          margin: "40px auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-500)", textAlign: "center" }}>
          O cliente escaneia e cai direto no cardápio Donna FIT.
        </p>

        {/* QR Card */}
        <div
          style={{
            background: "var(--surface-100)",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            width: "100%",
            maxWidth: 320,
          }}
        >
          <div
            style={{
              padding: 16,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <QRCodeSVG
              value={SITE_URL}
              size={200}
              bgColor="#FFFFFF"
              fgColor="#0C150C"
              level="H"
            />
          </div>

          {/* Donna FIT branding no QR */}
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                fontWeight: 800,
                color: "var(--text-950)",
                letterSpacing: "1px",
              }}
            >
              DONNA FIT
            </p>
            <p style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
              {SITE_URL}
            </p>
          </div>
        </div>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            maxWidth: 320,
            padding: "13px 24px",
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
            color: "#fff",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 12px rgba(200,155,60,0.25)",
          }}
        >
          <Printer size={15} strokeWidth={1.8} />
          Imprimir QR Code
        </button>
      </div>
    </div>
  )
}
