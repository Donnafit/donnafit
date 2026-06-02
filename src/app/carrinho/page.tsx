"use client"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { formatCurrency } from '@/lib/utils'

export default function CarrinhoPage() {
  const { items, total, count, updateQuantity, removeItem } = useCart()
  const router = useRouter()
  const qty = count()

  return (
    <div style={{ background: 'linear-gradient(160deg, #FFFDF8 0%, #FBF6EE 50%, #F5EDD8 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'white',
        padding: '0 20px',
        height: 64,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid #F0EDE8',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#C89B3C', fontWeight: 700, fontSize: 14,
            fontFamily: 'var(--font-montserrat, Montserrat)', textDecoration: 'none',
            minHeight: 44, padding: '0 8px', borderRadius: 10,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Voltar ao menu
          </Link>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-montserrat, Montserrat)', fontWeight: 900, fontSize: 18, color: '#1A1A1A' }}>Meu Carrinho</span>
          </div>
          <div style={{ minWidth: 80, textAlign: 'right' }}>
            {qty > 0 && (
              <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
                {qty} {qty === 1 ? 'item' : 'itens'}
              </span>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 0 120px' }}>

        {/* Carrinho vazio */}
        {qty === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
            <h2 style={{ fontFamily: 'var(--font-montserrat, Montserrat)', fontWeight: 800, fontSize: 20, color: '#1A1A1A', marginBottom: 10 }}>
              Carrinho vazio
            </h2>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
              Adicione produtos do cardapio para continuar.
            </p>
            <Link
              href="/"
              className="btn-primary"
              style={{ maxWidth: 200, margin: '0 auto', display: 'flex', textDecoration: 'none' }}
            >
              Ver Cardapio
            </Link>
          </div>
        )}

        {/* Lista de itens */}
        {qty > 0 && (
          <>
            <div style={{ padding: '0 20px', marginBottom: 20 }}>
              {items.map(item => (
                <div key={item.product.id} style={{
                  background: 'white', borderRadius: 16, padding: 14, marginBottom: 12,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img
                    src={item.product.image_url || '/marmita.jpg'}
                    alt={item.product.name}
                    style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/marmita.jpg' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-montserrat, Montserrat)', fontWeight: 700, fontSize: 14,
                      color: '#1A1A1A', marginBottom: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#C89B3C', marginBottom: 8 }}>
                      {formatCurrency(item.product.price * item.quantity)}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid #E5E0D8', borderRadius: 10, overflow: 'hidden' }}>
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(item.product.id, item.quantity - 1)
                            : removeItem(item.product.id)
                        }
                        className="qty-btn"
                        style={{ borderRadius: 0 }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 700, fontSize: 14, padding: '0 4px' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="qty-btn"
                        style={{ borderRadius: 0 }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    style={{
                      width: 44, height: 44,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 10, background: '#FEF2F2', border: 'none', cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Resumo */}
            <div className="card-white" style={{ margin: '0 20px 20px', borderRadius: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-montserrat, Montserrat)', fontWeight: 800, fontSize: 15, color: '#1A1A1A', marginBottom: 16 }}>
                Resumo do Pedido
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{formatCurrency(total())}</span>
                </div>
                <div style={{
                  borderTop: '1.5px dashed #E5E0D8', paddingTop: 12, marginTop: 4,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-montserrat, Montserrat)', fontWeight: 800, fontSize: 16, color: '#1A1A1A' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-montserrat, Montserrat)', fontWeight: 900, fontSize: 20, color: '#C89B3C' }}>{formatCurrency(total())}</span>
                </div>
              </div>
            </div>

            {/* Botao finalizar */}
            <div style={{ padding: '0 20px' }}>
              <button
                onClick={() => router.push('/checkout')}
                className="btn-primary"
                style={{ height: 56, fontSize: 16 }}
              >
                Finalizar Pedido
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
