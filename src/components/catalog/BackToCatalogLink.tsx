"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function BackToCatalogLink() {
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    // document.referrer não muda em navegações client-side (SPA) do
    // Next.js, então não serve para detectar se viemos do cardápio.
    // history.length > 1 cobre esse caso: cresce a cada navegação
    // por Link dentro do app, mesmo sem um novo carregamento de página.
    setCanGoBack(window.history.length > 1)
  }, [])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    if (canGoBack) router.back()
    else router.push("/")
  }

  return (
    <a
      href="/"
      onClick={handleClick}
      style={{ color: "#888", fontSize: 13, textDecoration: "none", fontFamily: "var(--font-switzer), sans-serif", display: "flex", alignItems: "center", gap: 6 }}
    >
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Cardápio
    </a>
  )
}
