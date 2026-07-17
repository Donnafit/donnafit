import { InfoPageLayout } from "@/components/layout/InfoPageLayout"

export const metadata = { title: "Termos de Uso — Donna FIT" }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 16, color: "#1A1A1A", marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: "#5A5550", lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  )
}

export default function TermosPage() {
  return (
    <InfoPageLayout
      title="Termos de Uso"
      subtitle="Última atualização: junho de 2026"
    >
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #EDE8E0", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>

        <Section title="1. Aceitação dos termos">
          <p>
            Ao utilizar o site da Donna FIT e realizar pedidos, você concorda com estes Termos de Uso. Se não concordar com qualquer parte, por favor não utilize nossos serviços.
          </p>
        </Section>

        <Section title="2. Sobre os produtos">
          <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Todos os pratos são preparados diariamente com ingredientes frescos, sem conservantes artificiais.</li>
            <li>As fotos dos produtos são ilustrativas. Pequenas variações de apresentação podem ocorrer.</li>
            <li>Informações nutricionais são estimativas e podem variar conforme disponibilidade de ingredientes.</li>
            <li>Em caso de alergias ou restrições alimentares, entre em contato <strong>antes de realizar o pedido</strong>.</li>
          </ul>
        </Section>

        <Section title="3. Pedidos e pagamento">
          <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Pedidos realizados pelo site são confirmados via WhatsApp por nossa equipe.</li>
            <li>Pagamentos podem ser realizados via PIX (com 2% de desconto), cartão de crédito, débito ou dinheiro na entrega.</li>
            <li>O pedido só é confirmado após validação de disponibilidade e confirmação do pagamento.</li>
            <li>Nos reservamos o direito de recusar pedidos em casos de indisponibilidade de estoque.</li>
          </ul>
        </Section>

        <Section title="4. Entrega">
          <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Entregamos nos bairros listados na nossa <a href="/area-de-entrega" style={{ color: "#5A6B2A" }}>área de entrega</a>.</li>
            <li>O prazo de entrega é de 1 dia útil para pedidos realizados até as 18h.</li>
            <li>Não nos responsabilizamos por atrasos causados por condições climáticas adversas ou situações fora do nosso controle.</li>
            <li>Caso não haja ninguém para receber o pedido no endereço informado, a taxa de reentrega será cobrada.</li>
          </ul>
        </Section>

        <Section title="5. Cancelamentos e devoluções">
          <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Cancelamentos são aceitos até 2 horas antes da produção do pedido (geralmente até as 8h do dia de entrega).</li>
            <li>Em caso de produto com defeito ou divergência em relação ao pedido, entre em contato imediatamente via WhatsApp com foto do produto.</li>
            <li>Reembolsos são processados em até 3 dias úteis para pagamentos via PIX.</li>
          </ul>
        </Section>

        <Section title="6. Uso do site">
          <p>
            O conteúdo deste site (textos, imagens, marca e layout) é de propriedade da Donna FIT. É proibida a reprodução total ou parcial sem autorização expressa. O uso do site é permitido apenas para fins pessoais e não comerciais.
          </p>
        </Section>

        <Section title="7. Limitação de responsabilidade">
          <p>
            A Donna FIT não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso ou incapacidade de uso dos nossos serviços, além do valor do pedido realizado.
          </p>
        </Section>

        <Section title="8. Alterações nos termos">
          <p>
            Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas via WhatsApp ou publicadas no site com antecedência razoável.
          </p>
        </Section>

        <Section title="9. Contato">
          <p>
            Dúvidas sobre estes termos:<br />
            <strong>Donna FIT</strong> — Curitiba/PR<br />
            WhatsApp: <a href="https://wa.me/5541999154720" style={{ color: "#5A6B2A" }}>(41) 99915-4720</a>
          </p>
        </Section>

      </div>
    </InfoPageLayout>
  )
}
