"use client"
import { useEffect, useState } from "react"
import { Clock, Store, Bell, Percent, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DeliveryZonesModal } from "@/components/admin/DeliveryZonesModal"
import {
  DAY_LABELS,
  DISPLAY_DAY_ORDER,
  parseWeeklyHours,
  type DayKey,
  type DayMode,
  type DayOverride,
  type WeeklyHours,
} from "@/lib/business-hours"

interface StoreSettings {
  storeName: string
  whatsapp: string
  openHour: string
  closeHour: string
  orderSound: boolean
  pixDiscountPercent: string
  pickupAddress: string
  weeklyHours: WeeklyHours
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Donna FIT",
  whatsapp: "",
  openHour: "10",
  closeHour: "22",
  orderSound: true,
  pixDiscountPercent: "2",
  pickupAddress: "",
  weeklyHours: {},
}

async function loadSettings(): Promise<StoreSettings> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data } = await supabase.from("store_settings").select("*").eq("id", "default").single()
  if (!data) return DEFAULT_SETTINGS
  return {
    storeName: data.store_name,
    whatsapp: data.whatsapp ?? "",
    openHour: String(data.open_hour),
    closeHour: String(data.close_hour),
    orderSound: data.order_sound,
    pixDiscountPercent: String(Number(data.pix_discount_rate ?? 0.02) * 100),
    pickupAddress: data.pickup_address ?? "",
    weeklyHours: parseWeeklyHours(data.weekly_hours),
  }
}

const MODE_LABELS: Record<DayMode, string> = {
  default: "Padrão",
  custom: "Personalizado",
  closed: "Fechado",
}

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
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showZonesModal, setShowZonesModal] = useState(false)

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  function update<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function updateDay(day: DayKey, override: DayOverride | undefined) {
    setSettings((prev) => {
      const next = { ...prev.weeklyHours }
      if (!override || override.mode === "default") delete next[day]
      else next[day] = override
      return { ...prev, weeklyHours: next }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: settings.storeName,
          whatsapp: settings.whatsapp,
          openHour: Number(settings.openHour),
          closeHour: Number(settings.closeHour),
          orderSound: settings.orderSound,
          pixDiscountRate: Number(settings.pixDiscountPercent) / 100,
          pickupAddress: settings.pickupAddress,
          weeklyHours: settings.weeklyHours,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
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
            Gerencie horários e preferências do sistema
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 700,
            padding: "10px 22px",
            borderRadius: 10,
            background: saved ? "rgba(52,211,153,0.12)" : "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
            color: saved ? "#34D399" : "#fff",
            border: saved ? "1px solid rgba(52,211,153,0.25)" : "none",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
            transition: "all 250ms",
          }}
        >
          {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
      {error && (
        <div style={{ maxWidth: 680, margin: "16px auto 0", padding: "0 32px" }}>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 12, color: "#DC2626",
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9,
            padding: "10px 14px",
          }}>
            {error}
          </p>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 32px" }}>

        <Section title="Dados do restaurante" description="Informações exibidas para os clientes" icon={Store}>
          <Field label="Nome do restaurante">
            <input value={settings.storeName} onChange={(e) => update("storeName", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="WhatsApp (com DDD)">
            <input
              value={settings.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="(11) 99999-9999"
              style={inputStyle}
            />
          </Field>
          <Field label="Endereço de retirada">
            <input
              value={settings.pickupAddress}
              onChange={(e) => update("pickupAddress", e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF, CEP"
              style={inputStyle}
            />
          </Field>
        </Section>

        <Section title="Horário de atendimento" description="Define quando o restaurante aparece como Online no painel" icon={Clock}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Abertura">
              <select value={settings.openHour} onChange={(e) => update("openHour", e.target.value)} style={{ ...inputStyle, cursor: "pointer", paddingRight: 32 }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </Field>
            <Field label="Fechamento">
              <select value={settings.closeHour} onChange={(e) => update("closeHour", e.target.value)} style={{ ...inputStyle, cursor: "pointer", paddingRight: 32 }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </Field>
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
            Atualmente: {settings.openHour}h às {settings.closeHour}h — o badge no painel reflete esse horário automaticamente
          </p>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--surface-200)" }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--text-950)" }}>
              Dias personalizados
            </p>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)", marginTop: 2, marginBottom: 14 }}>
              Sobrescreve o horário padrão em dias específicos — ex.: sábado com horário reduzido, domingo fechado
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DISPLAY_DAY_ORDER.map((day) => {
                const override = settings.weeklyHours[day]
                const mode: DayMode = override?.mode ?? "default"
                const dayOpenHour = override?.openHour ?? Number(settings.openHour)
                const dayCloseHour = override?.closeHour ?? Number(settings.closeHour)

                return (
                  <div key={day} data-testid={`weekly-hours-row-${day}`} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ width: 100, flexShrink: 0, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text-950)" }}>
                      {DAY_LABELS[day]}
                    </span>

                    <div style={{ display: "flex", gap: 4, background: "var(--surface-50)", border: "1px solid var(--surface-200)", borderRadius: 9, padding: 3 }}>
                      {(["default", "custom", "closed"] as DayMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() =>
                            updateDay(
                              day,
                              m === "default"
                                ? undefined
                                : m === "closed"
                                  ? { mode: "closed" }
                                  : { mode: "custom", openHour: dayOpenHour, closeHour: dayCloseHour }
                            )
                          }
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "6px 10px",
                            borderRadius: 7,
                            border: "none",
                            cursor: "pointer",
                            background: mode === m ? "var(--gold-500)" : "transparent",
                            color: mode === m ? "#fff" : "var(--text-500)",
                            transition: "all 150ms",
                          }}
                        >
                          {MODE_LABELS[m]}
                        </button>
                      ))}
                    </div>

                    {mode === "custom" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <select
                          value={dayOpenHour}
                          onChange={(e) => updateDay(day, { mode: "custom", openHour: Number(e.target.value), closeHour: dayCloseHour })}
                          style={{ ...inputStyle, width: 96, cursor: "pointer", paddingRight: 28 }}
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-300)" }}>às</span>
                        <select
                          value={dayCloseHour}
                          onChange={(e) => updateDay(day, { mode: "custom", openHour: dayOpenHour, closeHour: Number(e.target.value) })}
                          style={{ ...inputStyle, width: 96, cursor: "pointer", paddingRight: 28 }}
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
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
            <button
              type="button"
              role="switch"
              aria-checked={settings.orderSound}
              aria-label="Som ao receber pedido"
              onClick={() => update("orderSound", !settings.orderSound)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: "none", padding: 0,
                background: settings.orderSound ? "var(--gold-500)" : "var(--surface-200)",
                position: "relative", cursor: "pointer", flexShrink: 0,
                transition: "background 150ms",
              }}
            >
              <div style={{
                position: "absolute", left: settings.orderSound ? 21 : 3, top: 3,
                width: 16, height: 16, borderRadius: "50%",
                background: settings.orderSound ? "var(--surface-100)" : "var(--text-300)",
                transition: "left 150ms",
              }} />
            </button>
          </div>
        </Section>

        <Section title="Desconto PIX" description="Percentual aplicado no checkout quando o cliente paga via PIX" icon={Percent}>
          <Field label="Desconto (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={settings.pixDiscountPercent}
              onChange={(e) => update("pixDiscountPercent", e.target.value)}
              style={inputStyle}
            />
          </Field>
        </Section>

        <Section title="Frete por bairro" description="Taxas de entrega usadas pelo reconhecimento automático de endereço" icon={MapPin}>
          <button
            type="button"
            onClick={() => setShowZonesModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10,
              border: "1px solid var(--surface-200)", background: "var(--surface-50)",
              fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, color: "var(--text-700)",
              cursor: "pointer",
            }}
          >
            <MapPin size={14} /> Gerenciar taxas por bairro
          </button>
        </Section>

      </div>

      {showZonesModal && <DeliveryZonesModal onClose={() => setShowZonesModal(false)} />}
    </div>
  )
}
