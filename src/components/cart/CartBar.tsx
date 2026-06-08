"use client"
import { useCart } from '@/hooks/useCart'
import { usePathname, useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function CartBar() {
  const [mounted, setMounted] = useState(false)
  const { count, total } = useCart()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const qty = count()
  const hideRoutes = ['/checkout', '/confirmacao', '/carrinho']

  const shouldHide = !mounted || hideRoutes.some(r => pathname.startsWith(r)) || qty === 0

  return (
    <div
      id="cart-bar-float"
      className={shouldHide ? 'hidden-bar' : ''}
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        paddingLeft: 16,
        paddingRight: 16,
        maxWidth: 540,
        margin: '0 auto',
      }}
    >
      <button
        onClick={() => router.push('/carrinho')}
        className="cart-bar-btn"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: '#1A1A1A',
          borderRadius: '20px 20px 0 0',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: '#C89B3C', borderRadius: 10,
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {qty} {qty === 1 ? 'item' : 'itens'} — {formatCurrency(total())}
          </span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#C89B3C' }}>
          Ver carrinho
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </span>
      </button>
    </div>
  )
}

export default CartBar
