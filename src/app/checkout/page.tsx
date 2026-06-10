import Link from "next/link"
import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default function CheckoutPage() {
  return (
    <div style={{ background: "linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)", minHeight: "100vh" }}>

      {/* Header sticky com stepper */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "white",
        borderBottom: "1px solid #F0EDE8",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        {/* Linha superior: voltar + titulo */}
        <div style={{
          maxWidth: 640, margin: "0 auto", width: "100%",
          padding: "0 20px",
          height: 64,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Link href="/carrinho" style={{
            display: "flex", alignItems: "center", gap: 6,
            color: "#C89B3C", fontWeight: 700, fontSize: 14,
            fontFamily: "var(--font-montserrat, Montserrat)", textDecoration: "none",
            minHeight: 44, padding: "0 8px", borderRadius: 10,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Voltar
          </Link>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 900, fontSize: 18, color: "#1A1A1A" }}>
              Finalizar Pedido
            </span>
          </div>
          <div style={{ minWidth: 60 }} />
        </div>

        {/* Stepper */}
        <div style={{
          maxWidth: 640, margin: "0 auto",
          padding: "12px 20px 16px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
        }}>
          {/* Step 1: Carrinho (done) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              className="step-done"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 13,
                transition: "all 0.3s",
              }}
            >
              ✓
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#5A6B2A", whiteSpace: "nowrap" }}>Carrinho</span>
          </div>

          {/* Conector 1→2 */}
          <div style={{ width: 48, height: 2, background: "linear-gradient(to right, #5A6B2A, #C89B3C)", margin: "0 2px", marginBottom: 14 }} />

          {/* Step 2: Seu pedido (active) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              className="step-active"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 13,
                transition: "all 0.3s",
              }}
            >
              2
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#C89B3C", whiteSpace: "nowrap" }}>Seu pedido</span>
          </div>

          {/* Conector 2→3 */}
          <div style={{ width: 48, height: 2, background: "linear-gradient(to right, #C89B3C, #E5E0D8)", margin: "0 2px", marginBottom: 14 }} />

          {/* Step 3: Confirmacao (inactive) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              className="step-inactive"
              style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 13,
                transition: "all 0.3s",
              }}
            >
              3
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", whiteSpace: "nowrap" }}>Confirmacao</span>
          </div>
        </div>
      </header>

      {/* Conteudo */}
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 120px" }}>
        <CheckoutForm />
      </main>
    </div>
  )
}
