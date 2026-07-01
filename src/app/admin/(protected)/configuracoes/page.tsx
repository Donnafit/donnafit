"use client"
import { useState } from "react"
import { User, Clock, Store, Bell } from "lucide-react"

function Section({ title, description, icon: Icon, children }: {
  title: string
  description: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: "var(--surface-100)",
      borderRadius: 14,
      border: "1px solid var(--surface-200)",
      overflow: "hidden",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "20px 24px 16px",
        borderBottom: "1px solid var(--surface-200)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(200,155,60,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} strokeWidth={1.8} style={{ color: "var(--gold-500)" }} />
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--text-950)" }}>
            {title}
          </p>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 1 }}>
            {description}
          </p>
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block",
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-500)",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--text-950)",
  background: "var(--surface-50)",
  border: "1px solid var(--surface-200)",
  borderRadius: 9,
  padding: "10px 14px",
  outline: "none",
  boxSizing: "border-box",
}

export default function ConfiguracoesPage() {
  const [adminName, setAdminName] = useState("Everson")
  const [storeName, setStoreName] = useState("Donna FIT")
  const [whatsapp,  setWhatsapp]  = useState("")
  const [openHour,  setOpenHour]  = useState("10")
  const [closeHour, setCloseHour] = useState("22")
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--surface-50)" }}>
      {/* Header */}
      <div style={{
        background: "var(--surface-100)",
        borderBottom: "1px solid var(--surface-200)",
        padding: "22px 32px",
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 800, color: "var(--text-950)" }}>
            Configurações
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)", marginTop: 2 }}>
            Gerencie perfil, horários e preferências do sistema
          </p>
        </div>
        <button
          onClick={handleSave}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 700,
            padding: "10px 22px",
            borderRadius: 10,
            background: saved ? "rgba(52,211,153,0.12)" : "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
            color: saved ? "#34D399" : "#fff",
            border: saved ? "1px solid rgba(52,211,153,0.25)" : "none",
            cursor: "pointer",
            transition: "all 250ms",
          }}
        >
          {saved ? "Salvo!" : "Salvar alterações"}
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 32px" }}>

        <Section title="Perfil do administrador" description="Nome exibido no painel" icon={User}>
          <Field label="Nome">
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} style={inputStyle} />
          </Field>
        </Section>

        <Section title="Dados do restaurante" description="Informações exibidas para os clientes" icon={Store}>
          <Field label="Nome do restaurante">
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="WhatsApp (com DDD)">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
              style={inputStyle}
            />
          </Field>
        </Section>

        <Section title="Horário de atendimento" description="Define quando o restaurante aparece como Online no painel" icon={Clock}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Abertura">
              <select value={openHour} onChange={(e) => setOpenHour(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </Field>
            <Field label="Fechamento">
              <select value={closeHour} onChange={(e) => setCloseHour(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </Field>
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
            Atualmente: {openHour}h às {closeHour}h — o badge no painel reflete esse horário automaticamente
          </p>
        </Section>

        <Section title="Notificações" description="Alertas de novos pedidos" icon={Bell}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)" }}>
                Som ao receber pedido
              </p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
                Toca um alerta sonoro quando um novo pedido chegar
              </p>
            </div>
            <div style={{
              width: 40, height: 22, borderRadius: 11,
              background: "var(--gold-500)",
              position: "relative", cursor: "pointer", flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", right: 3, top: 3,
                width: 16, height: 16, borderRadius: "50%",
                background: "var(--surface-100)",
              }} />
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}
