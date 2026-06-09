import { InfoPageLayout } from "@/components/layout/InfoPageLayout"

export const metadata = { title: "Horários de Atendimento — Donna FIT" }

const HORARIOS = [
  { dia: "Segunda-feira",   horario: "10h às 19h",  aberto: true },
  { dia: "Terça-feira",     horario: "10h às 19h",  aberto: true },
  { dia: "Quarta-feira",    horario: "10h às 19h",  aberto: true },
  { dia: "Quinta-feira",    horario: "10h às 19h",  aberto: true },
  { dia: "Sexta-feira",     horario: "10h às 19h",  aberto: true },
  { dia: "Sábado",          horario: "10h às 15h",  aberto: true },
  { dia: "Domingo",         horario: "Fechado",      aberto: false },
  { dia: "Feriados",        horario: "Consulte",     aberto: null },
]

const INFO_CARDS = [
  {
    titulo: "Pedidos online",
    desc: "O site aceita pedidos 24 horas. Para pedidos fora do horário de atendimento, nossa equipe confirma no próximo dia útil.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    titulo: "Prazo de entrega",
    desc: "Pedidos realizados até as 18h são entregues no dia seguinte. Pedidos após esse horário são entregues em até 2 dias úteis.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    titulo: "Retirada no local",
    desc: "Disponível no mesmo horário de atendimento, sem taxa adicional. Endereço informado após confirmação do pedido.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function HorariosPage() {
  return (
    <InfoPageLayout
      title="Horários de Atendimento"
      subtitle="Confira quando estamos disponíveis para atender você."
    >
      {/* Tabela de horários */}
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #EDE8E0", overflow: "hidden", marginBottom: 40, boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
        {HORARIOS.map((item, i) => (
          <div key={item.dia} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: i < HORARIOS.length - 1 ? "1px solid #F5F0E8" : "none",
            background: item.aberto === false ? "#FAFAFA" : "transparent",
          }}>
            <span style={{
              fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 600, fontSize: 14,
              color: item.aberto === false ? "#B0A898" : "#1A1A1A",
            }}>
              {item.dia}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 14, fontWeight: 700,
                color: item.aberto === false ? "#B0A898" : item.aberto === null ? "#C89B3C" : "#5A6B2A",
                fontFamily: "var(--font-montserrat, Montserrat)",
              }}>
                {item.horario}
              </span>
              {item.aberto !== null && (
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                  background: item.aberto ? "#F2F7EC" : "#F5F5F5",
                  color: item.aberto ? "#5A6B2A" : "#B0A898",
                  borderRadius: 6, padding: "3px 8px",
                  fontFamily: "var(--font-montserrat, Montserrat)",
                }}>
                  {item.aberto ? "Aberto" : "Fechado"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 40 }}>
        {INFO_CARDS.map((card) => (
          <div key={card.titulo} style={{
            background: "#fff", borderRadius: 16, padding: "22px",
            border: "1px solid #EDE8E0",
          }}>
            <div style={{ color: "#5A6B2A", marginBottom: 12 }}>{card.icon}</div>
            <h3 style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 14, color: "#1A1A1A", marginBottom: 8 }}>
              {card.titulo}
            </h3>
            <p style={{ fontSize: 13, color: "#7A7570", lineHeight: 1.65, margin: 0 }}>
              {card.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Dúvidas */}
      <div style={{
        background: "#F2F7EC", borderRadius: 16, padding: "22px 24px",
        border: "1px solid #D8EAC8", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 4 }}>
            Dúvidas sobre entrega ou horários?
          </p>
          <p style={{ fontSize: 13, color: "#7A7570", margin: 0 }}>
            Nossa equipe responde rapidamente pelo WhatsApp.
          </p>
        </div>
        <a href="https://wa.me/5541999154720" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#25D366", color: "#fff",
          borderRadius: 10, padding: "11px 20px",
          fontSize: 13, fontWeight: 700, textDecoration: "none",
          fontFamily: "var(--font-montserrat, Montserrat)",
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L.057 23.17a.75.75 0 00.923.923l5.333-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.63-.485-5.163-1.336l-.37-.215-3.836 1.055 1.055-3.836-.215-.37A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Falar no WhatsApp
        </a>
      </div>
    </InfoPageLayout>
  )
}
