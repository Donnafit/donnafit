"use client"
import { useCart } from "@/hooks/useCart"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function HeaderCartButton() {
  const [mounted, setMounted] = useState(false)
  const { count } = useCart()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const qty = mounted ? count() : 0

  const [shouldShake, setShouldShake] = useState(false)

  // Dispara o tremor do ícone e pulso do badge ao alterar quantidade
  useEffect(() => {
    if (qty > 0) {
      setShouldShake(true)
      const timer = setTimeout(() => setShouldShake(false), 450)
      return () => clearTimeout(timer)
    }
  }, [qty])

  return (
    <button
      onClick={() => router.push('/carrinho')}
      aria-label="Carrinho"
      className="hover:bg-[#F5F0E8] transition-colors duration-200"
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <svg
        className={shouldShake ? "cart-shake" : ""}
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="#5A6B2A"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      {qty > 0 && (
        <span
          className={shouldShake ? "badge-pulse" : ""}
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 20,
            height: 20,
            background: '#C89B3C',
            color: '#fff',
            borderRadius: '50%',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {qty}
        </span>
      )}
    </button>
  )
}

export default HeaderCartButton
