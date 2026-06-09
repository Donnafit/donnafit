import { InfoPageLayout } from "@/components/layout/InfoPageLayout"
import Link from "next/link"

export const metadata = { title: "Como Fazer um Pedido — Donna FIT" }

const STEPS = [
  {
    num: "01",
    title: "Navegue pelo cardápio",
    desc: "Acesse a nossa loja e explore todas as opções de marmitas fitness, combos e pratos especiais disponíveis. Use os filtros de categoria para encontrar o que combina com a sua dieta.",
  },
  {
    num: "02",
    title: "Monte o seu carrinho",
    desc: "Clique no botão de adicionar em cada produto que desejar. Você pode ajustar as quantidades diretamente no carrinho antes de finalizar.",
  },
  {
    num: "03",
    title: "Finalize o pedido",
    desc: 'Clique em "Finalizar Pedido", preencha seus dados (nome, telefone e endereço de entrega se necessário) e escolha a forma de pagamento. PIX tem 5% de desconto!',
  },
  {
    num: "04",
    title: "Confirmação via WhatsApp",
    desc: "Após confirmar, você é redirecionado para o WhatsApp para finalizar com nossa equipe. Respondemos em instantes durante o horário de atendimento.",
  },
  {
    num: "05",
    title: "Receba no dia seguinte",
    desc: "Pedidos realizados até as 18h são entregues no dia seguinte. Nossa equipe entra em contato para confirmar o horário de entrega ou retirada.",
  },
]

export default function ComoPedirPage() {
  return (
    <InfoPageLayout
      title="Como Fazer um Pedido"
      subtitle="É rápido e simples. Veja o passo a passo para receber suas marmitas Donna FIT em casa."
    >
      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 48 }}>
        {STEPS.map((step) => (
          <div key={step.num} style={{
            display: "flex", gap: 20, alignItems: "flex-start",
            background: "#fff", borderRadius: 16, padding: "24px 28px",
            border: "1px solid #EDE8E0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          }}>
            <div style={{
              fontFamily: "var(--font-montserrat, Montserrat)",
              fontWeight: 900, fontSize: 32, color: "#EDE8E0",
              lineHeight: 1, flexShrink: 0, minWidth: 44,
            }}>
              {step.num}
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 16, color: "#1A1A1A", marginBottom: 6 }}>
                {step.title}
              </h2>
              <p style={{ fontSize: 14, color: "#7A7570", lineHeight: 1.7, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        background: "linear-gradient(135deg, #2D3D14, #3D5018)",
        borderRadius: 20, padding: "32px 36px",
        display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 6 }}>
            Pronto para pedir?
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0 }}>
            Veja o cardápio e monte o seu pedido agora mesmo.
          </p>
        </div>
        <Link href="/" style={{
          background: "linear-gradient(135deg, #C89B3C, #E8B84D)",
          color: "#fff", borderRadius: 12, padding: "14px 28px",
          fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 14,
          textDecoration: "none", flexShrink: 0,
          boxShadow: "0 4px 16px rgba(200,155,60,0.4)",
        }}>
          Ver cardápio
        </Link>
      </div>
    </InfoPageLayout>
  )
}
