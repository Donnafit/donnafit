import { createClient } from "@/lib/supabase/server"
import { InfoPageLayout } from "@/components/layout/InfoPageLayout"

export const metadata = { title: "Área de Entrega — Donna FIT" }
export const dynamic = "force-dynamic"

export default async function AreaDeEntregaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("name, fee")
    .eq("active", true)
    .order("name")

  const bairros: { name: string; fee: number }[] = zones ?? []
  const menorTaxa = bairros.length ? Math.min(...bairros.map((z) => Number(z.fee))) : null

  return (
    <InfoPageLayout
      title="Área de Entrega"
      subtitle="Realizamos entregas em toda Curitiba. Confira os bairros atendidos abaixo."
    >
      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
        {[
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5A6B2A" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
              </svg>
            ),
            label: "Entrega no dia seguinte", sub: "Pedidos até 18h",
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5A6B2A" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            ),
            label: "Frete por bairro", sub: menorTaxa != null ? `A partir de R$ ${menorTaxa.toFixed(2).replace(".", ",")}` : "Consulte pelo WhatsApp",
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5A6B2A" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            ),
            label: "Retirada grátis", sub: "Sem taxa de entrega",
          },
        ].map((c) => (
          <div key={c.label} style={{
            background: "#fff", borderRadius: 14, padding: "20px 18px",
            border: "1px solid #EDE8E0", textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 13, color: "#1A1A1A", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "#9E9790" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bairros e taxas */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px",
        border: "1px solid #EDE8E0", marginBottom: 40,
      }}>
        <h2 style={{
          fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 800, fontSize: 13,
          color: "#5A6B2A", textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 14, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C89B3C", display: "inline-block" }} />
          Bairros atendidos
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {bairros.map((z) => (
            <span key={z.name} style={{
              fontSize: 12, color: "#5A6B2A",
              background: "#F2F7EC", borderRadius: 6,
              padding: "3px 9px", fontWeight: 500,
            }}>
              {z.name} — R$ {Number(z.fee).toFixed(2).replace(".", ",")}
            </span>
          ))}
        </div>
      </div>

      {/* Não encontrou */}
      <div style={{
        background: "#FDF9F0", borderRadius: 16, padding: "24px 28px",
        border: "1px solid #EDE8E0", display: "flex", gap: 16, alignItems: "flex-start",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C89B3C" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p style={{ fontFamily: "var(--font-montserrat, Montserrat)", fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 6 }}>
            Não encontrou seu bairro?
          </p>
          <p style={{ fontSize: 13, color: "#7A7570", margin: "0 0 12px" }}>
            Entre em contato pelo WhatsApp para verificar a disponibilidade para o seu endereço.
          </p>
          <a href="https://wa.me/5541999154720" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#25D366", color: "#fff",
            borderRadius: 10, padding: "10px 18px",
            fontSize: 13, fontWeight: 700, textDecoration: "none",
            fontFamily: "var(--font-montserrat, Montserrat)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L.057 23.17a.75.75 0 00.923.923l5.333-1.466A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.63-.485-5.163-1.336l-.37-.215-3.836 1.055 1.055-3.836-.215-.37A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </InfoPageLayout>
  )
}
