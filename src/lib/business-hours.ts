/**
 * Fonte única de verdade para horário de atendimento do restaurante.
 *
 * Antes desta lib, três lugares calculavam/mostravam horário de forma
 * independente e divergente: o badge Online/Fechado do admin (só
 * open_hour/close_hour, ignorando dia da semana), o Footer do
 * cardápio (texto fixo no componente) e a página /horarios (array
 * hardcoded). Todos passam a usar as funções daqui, alimentadas pela
 * mesma linha de store_settings.
 */

export type DayKey = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab"

// Ordem alinhada com Date#getDay() (0 = domingo ... 6 = sábado).
export const DAY_KEYS: DayKey[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]

// Ordem de exibição (semana começando na segunda), usada no admin e nas páginas públicas.
export const DISPLAY_DAY_ORDER: DayKey[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]

export const DAY_LABELS: Record<DayKey, string> = {
  dom: "Domingo",
  seg: "Segunda-feira",
  ter: "Terça-feira",
  qua: "Quarta-feira",
  qui: "Quinta-feira",
  sex: "Sexta-feira",
  sab: "Sábado",
}

export const DAY_LABELS_SHORT: Record<DayKey, string> = {
  dom: "Dom",
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
}

export type DayMode = "default" | "custom" | "closed"

export interface DayOverride {
  mode: DayMode
  openHour?: number
  closeHour?: number
}

export type WeeklyHours = Partial<Record<DayKey, DayOverride>>

export interface StoreHoursConfig {
  openHour: number
  closeHour: number
  weeklyHours: WeeklyHours
}

export type EffectiveHours =
  | { closed: true }
  | { closed: false; openHour: number; closeHour: number }

function isValidHour(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23
}

/**
 * Normaliza o jsonb vindo do banco (pode ser null, {} ou lixo malformado
 * se alguém editar direto no SQL Editor) num WeeklyHours confiável.
 * Dias com dado inválido caem em "default" silenciosamente.
 */
export function parseWeeklyHours(raw: unknown): WeeklyHours {
  if (!raw || typeof raw !== "object") return {}
  const result: WeeklyHours = {}
  for (const day of DAY_KEYS) {
    const entry = (raw as Record<string, unknown>)[day]
    if (!entry || typeof entry !== "object") continue
    const mode = (entry as Record<string, unknown>).mode
    if (mode === "closed") {
      result[day] = { mode: "closed" }
    } else if (mode === "custom") {
      const openHour = (entry as Record<string, unknown>).openHour
      const closeHour = (entry as Record<string, unknown>).closeHour
      if (isValidHour(openHour) && isValidHour(closeHour)) {
        result[day] = { mode: "custom", openHour, closeHour }
      }
    }
    // mode "default" (ou qualquer outro valor) não precisa de entrada — omitido = padrão.
  }
  return result
}

export function getEffectiveHours(config: StoreHoursConfig, day: DayKey): EffectiveHours {
  const override = config.weeklyHours[day]
  if (!override || override.mode === "default") {
    return { closed: false, openHour: config.openHour, closeHour: config.closeHour }
  }
  if (override.mode === "closed") return { closed: true }
  return {
    closed: false,
    openHour: override.openHour ?? config.openHour,
    closeHour: override.closeHour ?? config.closeHour,
  }
}

export function isOpenNow(config: StoreHoursConfig, now: Date = new Date()): boolean {
  const day = DAY_KEYS[now.getDay()]
  const hours = getEffectiveHours(config, day)
  if (hours.closed) return false
  const h = now.getHours()
  return h >= hours.openHour && h < hours.closeHour
}

function formatHours(hours: EffectiveHours): string {
  if (hours.closed) return "Fechado"
  return `${hours.openHour}h às ${hours.closeHour}h`
}

export interface WeeklyHoursDisplayGroup {
  label: string
  text: string
}

/**
 * Agrupa dias consecutivos com o mesmo horário, ex.: "Seg – Sex: 10h às 22h".
 * Usado no Footer (mesmo volume de informação que já existia, só com dado real).
 */
export function getWeeklyHoursDisplay(config: StoreHoursConfig): WeeklyHoursDisplayGroup[] {
  const perDay = DISPLAY_DAY_ORDER.map((day) => ({ day, text: formatHours(getEffectiveHours(config, day)) }))
  const groups: { days: DayKey[]; text: string }[] = []
  for (const { day, text } of perDay) {
    const last = groups[groups.length - 1]
    if (last && last.text === text) last.days.push(day)
    else groups.push({ days: [day], text })
  }
  return groups.map(({ days, text }) => ({
    label:
      days.length === 1
        ? DAY_LABELS_SHORT[days[0]]
        : `${DAY_LABELS_SHORT[days[0]]} – ${DAY_LABELS_SHORT[days[days.length - 1]]}`,
    text,
  }))
}

export interface DayScheduleDetail {
  day: DayKey
  dayLabel: string
  text: string
  aberto: boolean
}

/** Detalhe dia a dia (sem agrupar), usado na página /horarios. */
export function getWeeklyHoursFull(config: StoreHoursConfig): DayScheduleDetail[] {
  return DISPLAY_DAY_ORDER.map((day) => {
    const hours = getEffectiveHours(config, day)
    return { day, dayLabel: DAY_LABELS[day], text: formatHours(hours), aberto: !hours.closed }
  })
}
