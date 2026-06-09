import { InfoPageLayout } from "@/components/layout/InfoPageLayout"

export const metadata = { title: "Política de Privacidade — Donna FIT" }

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

export default function PrivacidadePage() {
  return (
    <InfoPageLayout
      title="Política de Privacidade"
      subtitle="Última atualização: junho de 2026"
    >
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #EDE8E0", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>

        <Section title="1. Informações que coletamos">
          <p>Ao realizar um pedido em nosso site, coletamos os seguintes dados:</p>
          <ul style={{ paddingLeft: 20, margin: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>Nome completo</strong> — para identificação do pedido;</li>
            <li><strong>Telefone (WhatsApp)</strong> — para confirmação e contato sobre entrega;</li>
            <li><strong>Endereço de entrega</strong> — quando selecionada a opção de entrega;</li>
            <li><strong>Preferências de pedidos</strong> — para personalizar sugestões futuras.</li>
          </ul>
          <p style={{ marginTop: 10 }}>Não coletamos dados de cartão de crédito. Pagamentos via PIX são confirmados manualmente.</p>
        </Section>

        <Section title="2. Como usamos suas informações">
          <p>Os dados coletados são usados exclusivamente para:</p>
          <ul style={{ paddingLeft: 20, margin: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Processar e confirmar seus pedidos;</li>
            <li>Entrar em contato sobre o status da entrega;</li>
            <li>Personalizar sugestões de produtos com base no seu histórico;</li>
            <li>Melhorar nossos serviços e cardápio.</li>
          </ul>
          <p style={{ marginTop: 10 }}>Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins de marketing.</p>
        </Section>

        <Section title="3. Compartilhamento de dados">
          <p>Seus dados podem ser compartilhados apenas em situações estritamente necessárias:</p>
          <ul style={{ paddingLeft: 20, margin: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>Entregadores parceiros</strong> — somente nome e endereço para viabilizar a entrega;</li>
            <li><strong>Autoridades legais</strong> — quando exigido por lei ou ordem judicial.</li>
          </ul>
        </Section>

        <Section title="4. Armazenamento e segurança">
          <p>
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS) e em repouso. Utilizamos a plataforma Supabase, que segue padrões internacionais de segurança de dados.
          </p>
          <p style={{ marginTop: 10 }}>
            Mantemos seus dados enquanto você for nosso cliente ativo. Você pode solicitar a exclusão a qualquer momento pelo WhatsApp.
          </p>
        </Section>

        <Section title="5. Seus direitos (LGPD)">
          <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
          <ul style={{ paddingLeft: 20, margin: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Confirmar a existência de tratamento dos seus dados;</li>
            <li>Acessar seus dados armazenados;</li>
            <li>Solicitar correção de dados incorretos;</li>
            <li>Solicitar a exclusão dos seus dados;</li>
            <li>Revogar consentimento a qualquer momento.</li>
          </ul>
          <p style={{ marginTop: 10 }}>
            Para exercer qualquer um desses direitos, entre em contato pelo WhatsApp: <strong>(41) 99915-4720</strong>.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            Nosso site pode utilizar cookies técnicos essenciais para o funcionamento do carrinho de compras e preferências de navegação. Não utilizamos cookies de rastreamento de terceiros para publicidade.
          </p>
        </Section>

        <Section title="7. Contato">
          <p>
            Em caso de dúvidas sobre esta política, entre em contato:<br />
            <strong>Donna FIT</strong> — Curitiba/PR<br />
            WhatsApp: <a href="https://wa.me/5541999154720" style={{ color: "#5A6B2A" }}>(41) 99915-4720</a>
          </p>
        </Section>

      </div>
    </InfoPageLayout>
  )
}
