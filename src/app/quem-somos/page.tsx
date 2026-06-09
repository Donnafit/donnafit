import { InfoPageLayout } from "@/components/layout/InfoPageLayout"

export const metadata = { title: "Quem Somos — Donna FIT" }

const VALORES = [
  {
    titulo: "Ingredientes frescos",
    desc: "Selecionamos os melhores ingredientes diariamente, priorizando fornecedores locais e produção sem conservantes artificiais.",
    cor: "#5A6B2A",
  },
  {
    titulo: "Sabor sem abrir mão da saúde",
    desc: "Nossa cozinha equilibra nutrição e sabor. Cada prato é desenvolvido para ser gostoso de verdade, não apenas saudável no papel.",
    cor: "#C89B3C",
  },
  {
    titulo: "Praticidade no dia a dia",
    desc: "Entregamos na sua porta para que você tenha mais tempo para o que importa. Alimentação saudável não precisa ser trabalhosa.",
    cor: "#3B8EA5",
  },
  {
    titulo: "Transparência",
    desc: "Cada marmita tem sua composição informada. Você sabe exatamente o que está comendo, sem surpresas.",
    cor: "#8A6B9A",
  },
]

export default function QuemSomosPage() {
  return (
    <InfoPageLayout title="Quem Somos">
      {/* Intro */}
      <div style={{
        background: "#fff", borderRadius: 20, padding: "36px",
        border: "1px solid #EDE8E0", marginBottom: 32,
        boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
      }}>
        <h2 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 900, fontSize: 20, color: "#1A1A1A", marginBottom: 16 }}>
          A história da Donna FIT
        </h2>
        <p style={{ fontSize: 15, color: "#5A5550", lineHeight: 1.8, marginBottom: 16 }}>
          A Donna FIT nasceu em Curitiba com uma missão simples: tornar a alimentação saudável acessível, saborosa e prática para quem não tem tempo — ou paciência — para cozinhar todo dia.
        </p>
        <p style={{ fontSize: 15, color: "#5A5550", lineHeight: 1.8, marginBottom: 16 }}>
          Começamos pequenos, atendendo vizinhos e amigos com marmitas preparadas com carinho. Com o tempo, a qualidade falou mais alto e nossa clientela cresceu por indicação, sem precisar de muito mais do que o boca a boca.
        </p>
        <p style={{ fontSize: 15, color: "#5A5550", lineHeight: 1.8, margin: 0 }}>
          Hoje, preparamos centenas de refeições por semana, mas mantemos o mesmo cuidado artesanal do início: cada prato é feito no dia, com ingredientes selecionados, e entregue fresco na sua casa.
        </p>
      </div>

      {/* Nossos valores */}
      <h2 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 900, fontSize: 18, color: "#1A1A1A", marginBottom: 20 }}>
        Nossos valores
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
        {VALORES.map((v) => (
          <div key={v.titulo} style={{
            background: "#fff", borderRadius: 16, padding: "24px",
            border: "1px solid #EDE8E0",
            borderTop: `3px solid ${v.cor}`,
          }}>
            <h3 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 14, color: "#1A1A1A", marginBottom: 8 }}>
              {v.titulo}
            </h3>
            <p style={{ fontSize: 13, color: "#7A7570", lineHeight: 1.7, margin: 0 }}>
              {v.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        background: "linear-gradient(135deg, #F5EDD8, #FBF6EE)",
        borderRadius: 20, padding: "32px 36px",
        border: "1px solid #EDE8E0",
        display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 16, color: "#1A1A1A", marginBottom: 6 }}>
            Fale com a gente
          </p>
          <p style={{ fontSize: 13, color: "#7A7570", margin: 0 }}>
            Sugestões, parcerias ou dúvidas — adoramos ouvir nossos clientes.
          </p>
        </div>
        <a href="https://wa.me/5541999154720" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#25D366", color: "#fff",
          borderRadius: 12, padding: "13px 22px",
          fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 13,
          textDecoration: "none", flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L.057 23.17a.75.75 0 00.923.923l5.333-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.63-.485-5.163-1.336l-.37-.215-3.836 1.055 1.055-3.836-.215-.37A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Enviar mensagem
        </a>
      </div>
    </InfoPageLayout>
  )
}
