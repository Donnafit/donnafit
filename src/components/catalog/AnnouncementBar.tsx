"use client"

import { useState, useEffect } from "react"

const FALLBACK = [
  "Marmitas saudáveis feitas com ingredientes frescos todos os dias",
  "Peça até as 18h e receba no dia seguinte",
  "Pague no PIX e ganhe 2% de desconto no pedido",
  "Opções low carb, veganas e sem glúten disponíveis",
]

interface Props {
  phrases?: string[]
}

export function AnnouncementBar({ phrases }: Props) {
  const items = phrases && phrases.length > 0 ? phrases : FALLBACK
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (items.length <= 1) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % items.length)
        setVisible(true)
      }, 400)
    }, 4000)
    return () => clearInterval(interval)
  }, [items.length])

  return (
    <div
      style={{
        background: "#5A6B2A",
        color: "#fff",
        textAlign: "center",
        padding: "8px 16px",
        fontFamily: "var(--font-montserrat, var(--font-switzer), sans-serif)",
        fontWeight: 500,
        letterSpacing: "0.01em",
        lineHeight: 1.4,
        minHeight: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span
        className="announcement-text"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          display: "block",
          fontSize: "clamp(10.5px, 3.4vw, 13px)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
      >
        {items[current]}
      </span>
    </div>
  )
}
