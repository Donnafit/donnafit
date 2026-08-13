"use client"

import { useEffect, useState } from "react"
import { matchDeliveryZone, normalize, type DeliveryZone } from "@/lib/deliveryZones"
import { isBlockedCity, BLOCKED_CITY_MESSAGE } from "@/lib/blockedCities"
import { lookupCep } from "@/lib/cep"
import type { DeliveryAddressData } from "@/lib/deliveryAddressMetadata"

export interface ResolvedZone {
  zone: DeliveryZone | null
  approximate: boolean
}

export interface AddressFieldsProps {
  zones: DeliveryZone[]
  value: DeliveryAddressData
  onChange: (value: DeliveryAddressData) => void
  onZoneResolved: (resolved: ResolvedZone) => void
  onBlockedChange: (blocked: boolean, cityText?: string) => void
  // false no modal de perfil (não há carrinho/frete pra mostrar ali, só o
  // cadastro do endereço padrão) — true no checkout.
  showFeeHint?: boolean
}

const NOT_LISTED_OPTION = "__not_listed__"

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
      return
    }
    setCepStatus("loading")
    const timer = setTimeout(async () => {
      const result = await lookupCep(digits)
      if (!result) {
        setCepStatus("not_found")
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
      onChange({
        ...value,
        street: result.street || value.street,
        bairro: matchedByName ? matchedByName.name : value.bairro,
        bairroNotListed: matchedByName ? false : value.bairroNotListed,
      })
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
          <select
            className="form-input"
            aria-label="Bairro"
            value={value.bairro}
            onChange={(e) => {
              const selected = e.target.value
              if (selected === NOT_LISTED_OPTION) {
                onChange({ ...value, bairro: "", bairroNotListed: true })
              } else {
                onChange({ ...value, bairro: selected, bairroNotListed: false })
              }
            }}
          >
            <option value="">Selecione seu bairro</option>
            {zones.map((z) => (
              <option key={z.name} value={z.name}>
                {z.name}
              </option>
            ))}
            <option value={NOT_LISTED_OPTION}>Meu bairro não está na lista</option>
          </select>
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
