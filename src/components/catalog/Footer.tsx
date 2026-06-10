"use client"

import Link from "next/link"

const NAV_LINKS = {
  cardapio: [
    { label: "Ver tudo",       href: "/" },
    { label: "Combos",         href: "/?cat=combos" },
    { label: "Marmitas",       href: "/?cat=marmitas" },
    { label: "Massas",         href: "/?cat=massas" },
    { label: "Sopas e Caldos", href: "/?cat=sopas-e-caldos" },
    { label: "Low Carb",       href: "/?cat=low-carb" },
    { label: "Vegetariano",    href: "/?cat=vegetariano" },
  ],
  atendimento: [
    { label: "Fale conosco",        href: "https://wa.me/5541999154720", external: true },
    { label: "Como fazer um pedido", href: "/como-pedir" },
    { label: "Área de entrega",     href: "/area-de-entrega" },
    { label: "Horários",            href: "/horarios" },
  ],
  institucional: [
    { label: "Quem somos",             href: "/quem-somos" },
    { label: "Política de privacidade", href: "/privacidade" },
    { label: "Termos de uso",           href: "/termos" },
  ],
}

const PAYMENTS = [
  { label: "PIX", bg: "#00BDAE", color: "#fff", accent: true },
  { label: "Crédito", bg: "transparent", color: "#888", border: true },
  { label: "Débito",  bg: "transparent", color: "#888", border: true },
  { label: "Dinheiro", bg: "transparent", color: "#888", border: true },
]

export function Footer() {
  return (
    <footer style={{ background: "#1A1A1A", color: "white" }}>

      {/* ── Conteúdo principal ─────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px 40px" }}>
        <div className="footer-grid">

          {/* Coluna da marca */}
          <div>
            {/* Logo + tagline */}
            <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 900, fontSize: 22, color: "#C89B3C", letterSpacing: "0.3px", marginBottom: 4 }}>
              Donna FIT
            </div>
            <div style={{ fontSize: 12, color: "#5A6B2A", fontWeight: 700, marginBottom: 16, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Alimentação Saudável
            </div>
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.75, marginBottom: 24, maxWidth: 240 }}>
              Marmitas fitness frescas e saborosas, preparadas diariamente com ingredientes selecionados para a sua saúde.
            </p>

            {/* WhatsApp CTA */}
            <a
              href="https://wa.me/5541999154720"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#25D366", color: "#fff",
                borderRadius: 10, padding: "10px 16px",
                fontSize: 13, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(37,211,102,0.3)",
                transition: "opacity 0.15s",
                fontFamily: "var(--font-montserrat, Montserrat)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L.057 23.17a.75.75 0 00.923.923l5.333-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.63-.485-5.163-1.336l-.37-.215-3.836 1.055 1.055-3.836-.215-.37A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              (41) 99915-4720
            </a>

            {/* Horário */}
            <div style={{ marginTop: 16, fontSize: 12, color: "#555", lineHeight: 1.8 }}>
              <div style={{ color: "#666", fontWeight: 600, marginBottom: 4 }}>Horário de atendimento</div>
              <div>Seg – Sex: 10h às 19h</div>
              <div>Sábado: 10h às 15h</div>
            </div>
          </div>

          {/* Coluna Cardápio */}
          <div>
            <h4 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 11, color: "#C89B3C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20, margin: "0 0 20px" }}>
              Cardápio
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
              {NAV_LINKS.cardapio.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} style={{ color: "#888", fontSize: 13, textDecoration: "none", fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 500, transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#C89B3C")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#888")}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna Atendimento */}
          <div>
            <h4 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 11, color: "#C89B3C", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 20px" }}>
              Atendimento
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
              {NAV_LINKS.atendimento.map(({ label, href, external }) => (
                <li key={label}>
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#888", fontSize: 13, textDecoration: "none", fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 500 }}
                      onMouseOver={(e) => (e.currentTarget.style.color = "#C89B3C")}
                      onMouseOut={(e) => (e.currentTarget.style.color = "#888")}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link href={href} style={{ color: "#888", fontSize: 13, textDecoration: "none", fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 500 }}
                      onMouseOver={(e) => (e.currentTarget.style.color = "#C89B3C")}
                      onMouseOut={(e) => (e.currentTarget.style.color = "#888")}
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna Institucional */}
          <div>
            <h4 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 11, color: "#C89B3C", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 20px" }}>
              Institucional
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
              {NAV_LINKS.institucional.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} style={{ color: "#888", fontSize: 13, textDecoration: "none", fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 500 }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#C89B3C")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#888")}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Badge seguro */}
            <div style={{ marginTop: 32, padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", display: "inline-flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6B2A" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#5A6B2A", fontFamily: "var(--font-montserrat, Montserrat)", letterSpacing: "0.05em" }}>Site seguro</span>
              </div>
              <span style={{ fontSize: 10, color: "#555" }}>Seus dados estão protegidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Divisor ────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", maxWidth: 1200, margin: "0 auto" }} />

      {/* ── Barra inferior ─────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 32px" }}>
        <div className="footer-bottom">

          {/* Formas de pagamento */}
          <div>
            <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "var(--font-montserrat, Montserrat)" }}>
              Formas de pagamento
            </div>
            <div className="payment-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* PIX */}
              <span style={{ background: "#00BDAE", color: "#fff", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-montserrat, Montserrat)", letterSpacing: "0.5px" }}>
                PIX
              </span>
              {/* 5% desconto badge */}
              <span style={{ background: "rgba(0,189,174,0.12)", color: "#00BDAE", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 600, border: "1px solid rgba(0,189,174,0.25)" }}>
                5% desconto
              </span>
              {/* Crédito */}
              <span style={{ background: "rgba(255,255,255,0.05)", color: "#777", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)" }}>
                Crédito
              </span>
              {/* Débito */}
              <span style={{ background: "rgba(255,255,255,0.05)", color: "#777", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)" }}>
                Débito
              </span>
              {/* Dinheiro */}
              <span style={{ background: "rgba(255,255,255,0.05)", color: "#777", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)" }}>
                Dinheiro
              </span>
            </div>
          </div>

          {/* Redes sociais + copyright */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
            {/* Redes sociais */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 6, fontFamily: "var(--font-montserrat, Montserrat)" }}>
                Siga-nos
              </span>
              {/* Instagram */}
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", textDecoration: "none", transition: "all 0.15s" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(225,48,108,0.15)"; e.currentTarget.style.color = "#E1306C" }}
                onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888" }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {/* WhatsApp */}
              <a href="https://wa.me/5541999154720" target="_blank" rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", textDecoration: "none", transition: "all 0.15s" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(37,211,102,0.15)"; e.currentTarget.style.color = "#25D366" }}
                onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#888" }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L.057 23.17a.75.75 0 00.923.923l5.333-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.63-.485-5.163-1.336l-.37-.215-3.836 1.055 1.055-3.836-.215-.37A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
              </a>
            </div>

            {/* Copyright */}
            <p style={{ fontSize: 11, color: "#444", margin: 0, textAlign: "right", fontFamily: "var(--font-montserrat, Montserrat)" }}>
              © 2026 Donna FIT · Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>

    </footer>
  )
}
