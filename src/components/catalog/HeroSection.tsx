import { Leaf, Utensils, Truck, Check } from "lucide-react"

export default function HeroSection() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "clamp(360px, 40vw, 480px)",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Background image */}
      <img
        src="/hero.jpg"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(3px)",
          transform: "scale(1.05)",
        }}
      />
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(26,26,26,0.90) 0%, rgba(90,107,42,0.80) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 800,
          margin: "0 auto",
          padding: "clamp(48px, 8vw, 72px) 24px",
          textAlign: "center",
          color: "white",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 9999,
            padding: "6px 18px",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 22,
            backdropFilter: "blur(8px)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <Leaf className="h-3.5 w-3.5 text-[#C89B3C]" /> Alimentação Saudável
        </div>

        <h1
          style={{
            fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(28px, 6vw, 48px)",
            lineHeight: 1.1,
            marginBottom: 16,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          Marmitas Saudáveis
          <br />
          <span style={{ color: "#C89B3C" }}>direto pra você</span>
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: "clamp(14px, 2vw, 16px)",
            lineHeight: 1.6,
            marginBottom: 36,
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Peça online, retire na loja ou receba em casa com praticidade
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 36,
          }}
        >
          {[
            { icon: <Utensils className="h-3.5 w-3.5 text-[#C89B3C]" />, label: "Comida Fresca" },
            { icon: <Truck className="h-3.5 w-3.5 text-[#C89B3C]" />, label: "Entrega Rápida" },
            { icon: <Check className="h-3.5 w-3.5 text-[#C89B3C]" />, label: "Pedido Fácil" },
          ].map((f) => (
            <div
              key={f.label}
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 9999,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.82)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                backdropFilter: "blur(4px)",
              }}
            >
              {f.icon} {f.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href="#produtos"
          className="hover:-translate-y-[2px] hover:shadow-[0_14px_36px_rgba(200,155,60,0.6)] transition-all duration-200"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#C89B3C",
            color: "#FFFFFF",
            borderRadius: 9999,
            padding: "14px 32px",
            fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 15,
            boxShadow: "0 8px 24px rgba(200,155,60,0.45)",
            textDecoration: "none",
            letterSpacing: "0.01em",
          }}
        >
          Ver Cardápio
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </section>
  )
}
