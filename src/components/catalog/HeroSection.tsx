export default function HeroSection() {
  return (
    <section
      style={{ position: 'relative', overflow: 'hidden', minHeight: 380, display: 'flex', alignItems: 'center' }}
      className="hero-section"
    >
      {/* Imagem de fundo */}
      <img
        src="/hero.jpg"
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          filter: 'blur(3px)',
          transform: 'scale(1.05)',
        }}
      />
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(26,26,26,0.88) 0%, rgba(90,107,42,0.78) 100%)',
      }} />

      {/* Conteúdo */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 700, margin: '0 auto',
        padding: '56px 24px',
        textAlign: 'center', color: 'white',
      }}>
        {/* Badge pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 100, padding: '6px 16px',
          fontSize: 13, fontWeight: 600,
          marginBottom: 20,
          backdropFilter: 'blur(8px)',
        }}>
          🌿 Alimentação Saudável
        </div>

        <h1 style={{
          fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
          fontWeight: 900,
          fontSize: 'clamp(28px, 6vw, 42px)',
          lineHeight: 1.15,
          marginBottom: 14,
          color: '#fff',
        }}>
          Marmitas Saudáveis<br />
          <span style={{ color: '#C89B3C' }}>direto pra você</span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 15, lineHeight: 1.6,
          marginBottom: 32,
          maxWidth: 400, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Peça online, retire ou receba em casa
        </p>

        {/* Feature pills */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12,
          flexWrap: 'wrap', marginBottom: 28,
        }}>
          {[
            { icon: '🥗', label: 'Comida Fresca' },
            { icon: '🛵', label: 'Entrega Rápida' },
            { icon: '✅', label: 'Pedido Fácil' },
          ].map(f => (
            <div key={f.label} style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: 100,
              padding: '6px 14px', fontSize: 12,
              color: 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {f.icon} {f.label}
            </div>
          ))}
        </div>

        {/* CTA button */}
        <a
          href="#produtos"
          onClick={e => {
            e.preventDefault();
            document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#C89B3C', color: '#FFFFFF',
            borderRadius: 14, padding: '14px 28px',
            fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
            fontWeight: 700, fontSize: 15,
            boxShadow: '0 8px 24px rgba(200,155,60,0.45)',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          Ver Cardápio
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
