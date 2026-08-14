"use client"

import { useEffect, useState } from "react"
import { MapPinOff } from "lucide-react"
import { matchDeliveryZone, normalize, type DeliveryZone } from "@/lib/deliveryZones"
import { isBlockedCity, BLOCKED_CITY_MESSAGE } from "@/lib/blockedCities"
import { lookupCep } from "@/lib/cep"
import type { DeliveryAddressData } from "@/lib/deliveryAddressMetadata"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface ResolvedZone {
  zone: DeliveryZone | null
  approximate: boolean
}

export interface AddressFieldsProps {
  zones: DeliveryZone[]
  value: DeliveryAddressData
  // Aceita também a forma funcional (igual a um setState do React): a resolução
  // do CEP é assíncrona e precisa mesclar em cima do valor ATUAL, não no que
  // existia quando o efeito começou.
  onChange: (value: DeliveryAddressData | ((prev: DeliveryAddressData) => DeliveryAddressData)) => void
  onZoneResolved: (resolved: ResolvedZone) => void
  onBlockedChange: (blocked: boolean, cityText?: string) => void
  // false no modal de perfil (não há carrinho/frete pra mostrar ali, só o
  // cadastro do endereço padrão) — true no checkout.
  showFeeHint?: boolean
}

const NOT_LISTED_OPTION = "__not_listed__"

// Select de bairro: usa @/components/ui/select (Radix, já instalado) em vez
// de <select> nativo — o navegador assume o controle total do visual de um
// <select> aberto (fonte do sistema, destaque azul, scrollbar padrão), o que
// quebrava a identidade visual do checkout/perfil. As classes abaixo
// sobrescrevem o tema cinza padrão do shadcn pelos tokens já usados no resto
// do formulário (mesma borda/raio/fonte de `.form-input`, verde/dourado da
// marca), via `tailwind-merge` (cn() em @/lib/utils) — sem CSS novo solto.
const bairroTriggerClass =
  "h-auto w-full cursor-pointer justify-between gap-2 rounded-xl border-[1.5px] border-[#E5E0D8] bg-white px-4 py-[14px] text-[15px] text-[#1A1A1A] shadow-none ring-0 ring-offset-0 transition-colors duration-200 focus:outline-none focus:ring-0 focus:border-[#C89B3C] data-[state=open]:border-[#C89B3C] data-[placeholder]:text-[#B0A898] [&_svg]:text-[#B0A898] [&_svg]:transition-transform [&_svg]:duration-200 data-[state=open]:[&_svg]:rotate-180"
// z-[1300]: o modal de perfil (ProfileModal.tsx) usa zIndex 180 — com o
// z-50 padrão do shadcn, o painel do Select renderizava POR BAIXO do modal
// (mesmo contexto de empilhamento, `position: fixed` em ambos, z-index é
// quem decide) e ficava invisível sempre que caía dentro da área do card do
// modal. 1300 fica acima de todo modal/drawer do app (maior valor usado
// hoje é 1200) e abaixo de toasts/alerts (9999).
// max-h-80 + overflow-y-auto: não depende de
// --radix-select-content-available-height, que não resolve de forma
// confiável dentro do modal — o painel vazava pra fora da tela sem isso.
const bairroContentClass =
  "z-[1300] max-h-80 overflow-y-auto rounded-2xl border border-[#E5E0D8] bg-white p-1.5 text-[#1A1A1A] shadow-[0_12px_32px_rgba(26,26,26,0.14)]"
const bairroItemClass =
  "cursor-pointer rounded-lg py-3 pl-3 pr-8 text-[14.5px] text-[#1A1A1A] focus:bg-[#F5F8F0] focus:text-[#1A1A1A] data-[state=checked]:font-semibold [&_svg]:text-[#5A6B2A]"
// Não é um bairro de verdade — fica visualmente separado (cor mais neutra +
// ícone) pra não se misturar com os 74 bairros reais da lista alfabética.
const bairroFallbackItemClass =
  "cursor-pointer rounded-lg py-3 pl-3 pr-3 text-[14.5px] text-[#8A8578] focus:bg-[#F5F8F0] focus:text-[#8A8578]"

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontWeight: 700,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 8,
}

export default function AddressFields({
  zones,
  value,
  onChange,
  onZoneResolved,
  onBlockedChange,
  showFeeHint = true,
}: AddressFieldsProps) {
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "not_found">("idle")
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [manualGeocoding, setManualGeocoding] = useState(false)

  // ── CEP → autopreenche rua e sugere bairro ──────────────────────────
  useEffect(() => {
    const digits = value.cep.replace(/\D/g, "")
    if (digits.length !== 8) {
      setCepStatus("idle")
      // Sem isso, o cliente cujo CEP caiu em cidade bloqueada ficava travado:
      // apagava o CEP pra digitar o endereço na mão e o bloqueio continuava,
      // porque nenhum dos outros dois efeitos re-roda se o bairro não mudou.
      // Cada um dos três efeitos sempre define o bloqueio pelo resultado da
      // PRÓPRIA avaliação, então limpar aqui é consistente com o resto — só
      // não limpa quando o bloqueio veio do bairro (outra fonte), que continua
      // valendo independente do CEP.
      if (!isBlockedCity(value.bairro)) {
        setBlockedMessage(null)
        onBlockedChange(false)
      }
      return
    }
    setCepStatus("loading")
    const timer = setTimeout(async () => {
      const result = await lookupCep(digits)
      if (!result) {
        setCepStatus("not_found")
        // CEP não achado não diz nada sobre cidade — não pode manter um
        // bloqueio vindo de um CEP anterior (mesma ressalva do bairro acima).
        if (!isBlockedCity(value.bairro)) {
          setBlockedMessage(null)
          onBlockedChange(false)
        }
        return
      }
      setCepStatus("idle")
      if (isBlockedCity(result.city)) {
        setBlockedMessage(BLOCKED_CITY_MESSAGE)
        onBlockedChange(true, result.city)
        return
      }
      setBlockedMessage(null)
      onBlockedChange(false)
      const matchedByName = zones.find((z) => normalize(z.name) === normalize(result.bairro))
      // Forma funcional de propósito: entre o debounce e a resposta do ViaCEP
      // (~500ms + rede) o cliente pode ter digitado complemento, mexido na rua
      // ou trocado o bairro. Espalhar o `value` capturado no início do efeito
      // desfazia essas edições em silêncio.
      onChange((prev) => ({
        ...prev,
        street: result.street || prev.street,
        bairro: matchedByName ? matchedByName.name : prev.bairro,
        bairroNotListed: matchedByName ? false : prev.bairroNotListed,
      }))
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.cep])

  // ── Bairro escolhido na lista: resolve a zona na hora, sem chamada de rede
  useEffect(() => {
    if (value.bairroNotListed) return
    if (!value.bairro) {
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    if (isBlockedCity(value.bairro)) {
      setBlockedMessage(BLOCKED_CITY_MESSAGE)
      onBlockedChange(true, value.bairro)
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    setBlockedMessage(null)
    onBlockedChange(false)
    const zone = zones.find((z) => z.name === value.bairro) ?? null
    onZoneResolved({ zone, approximate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.bairro, value.bairroNotListed, zones])

  // ── Fallback "meu bairro não está na lista": mesmo pipeline de texto
  // livre que o checkout já usava (matchDeliveryZone → geocoding externo).
  useEffect(() => {
    if (!value.bairroNotListed) return
    if (value.bairro.trim().length < 3) {
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    if (isBlockedCity(value.bairro)) {
      setBlockedMessage(BLOCKED_CITY_MESSAGE)
      onBlockedChange(true, value.bairro)
      onZoneResolved({ zone: null, approximate: false })
      return
    }
    setBlockedMessage(null)
    onBlockedChange(false)

    const localZone = matchDeliveryZone(value.bairro, zones)
    if (localZone) {
      onZoneResolved({ zone: localZone, approximate: false })
      return
    }

    const timer = setTimeout(async () => {
      setManualGeocoding(true)
      try {
        const res = await fetch("/api/geocode-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: value.bairro }),
        })
        const data = await res.json()
        onZoneResolved({ zone: data.zone ?? null, approximate: !!data.approximate })
      } catch {
        onZoneResolved({ zone: null, approximate: false })
      } finally {
        setManualGeocoding(false)
      }
    }, 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.bairro, value.bairroNotListed, zones])

  return (
    <div className="checkout-address-grid" style={{ marginTop: 16 }}>
      <div>
        <label style={labelStyle}>CEP (opcional)</label>
        <input
          type="text"
          className="form-input"
          value={value.cep}
          onChange={(e) => onChange({ ...value, cep: e.target.value })}
          placeholder="00000-000"
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={9}
        />
        {cepStatus === "loading" && (
          <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Buscando endereço...</p>
        )}
        {cepStatus === "not_found" && (
          <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            CEP não encontrado — preencha o endereço manualmente.
          </p>
        )}
      </div>

      <div>
        <label style={labelStyle}>Endereço (rua e número)</label>
        <input
          type="text"
          className="form-input"
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          placeholder="Rua, número"
          autoComplete="street-address"
        />
      </div>

      <div>
        <label style={labelStyle}>Bairro</label>
        {!value.bairroNotListed ? (
          <Select
            value={value.bairro || undefined}
            onValueChange={(selected) => {
              if (selected === NOT_LISTED_OPTION) {
                onChange({ ...value, bairro: "", bairroNotListed: true })
              } else {
                onChange({ ...value, bairro: selected, bairroNotListed: false })
              }
            }}
          >
            <SelectTrigger aria-label="Bairro" className={bairroTriggerClass}>
              <SelectValue placeholder="Selecione seu bairro" />
            </SelectTrigger>
            <SelectContent className={bairroContentClass}>
              {zones.map((z) => (
                <SelectItem key={z.name} value={z.name} className={bairroItemClass}>
                  {z.name}
                </SelectItem>
              ))}
              <SelectSeparator className="mx-1 my-1.5 h-px bg-[#E5E0D8]" />
              <SelectItem value={NOT_LISTED_OPTION} className={bairroFallbackItemClass}>
                <span className="flex items-center gap-2">
                  <MapPinOff size={15} aria-hidden="true" />
                  Meu bairro não está na lista
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <>
            <input
              type="text"
              className="form-input"
              value={value.bairro}
              onChange={(e) => onChange({ ...value, bairro: e.target.value })}
              placeholder="Digite o nome do seu bairro"
              autoFocus
            />
            <button
              type="button"
              onClick={() => onChange({ ...value, bairro: "", bairroNotListed: false })}
              style={{ fontSize: 12, color: "#5A6B2A", background: "none", border: "none", padding: "4px 0", cursor: "pointer" }}
            >
              ← Voltar pra lista de bairros
            </button>
          </>
        )}
      </div>

      <div>
        <label style={labelStyle}>Complemento (opcional)</label>
        <input
          type="text"
          className="form-input"
          value={value.complement}
          onChange={(e) => onChange({ ...value, complement: e.target.value })}
          placeholder="Apto, bloco, casa"
          autoComplete="address-line2"
        />
      </div>

      {blockedMessage && (
        <div style={{ gridColumn: "1 / -1" }}>
          <p style={{ fontSize: 13, color: "#B45309", fontWeight: 600 }}>{blockedMessage}</p>
        </div>
      )}

      {showFeeHint && !blockedMessage && manualGeocoding && (
        <div style={{ gridColumn: "1 / -1" }}>
          <p style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Identificando o bairro...</p>
        </div>
      )}
    </div>
  )
}
