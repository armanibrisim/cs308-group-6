'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { cartService } from '../../../services/cartService'
import { CartItem } from '../../../types/cart'

// ── Local-storage guest cart ──────────────────────────────────────────────────

const GUEST_CART_KEY = 'lumen_guest_cart'

interface GuestCartItem {
  id: string        // product_id acts as id for guest cart
  name: string
  price: number
  quantity: number
  image: string
  description: string
}

function loadGuestCart(): GuestCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]')
  } catch {
    return []
  }
}

function saveGuestCart(items: GuestCartItem[]): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
}

// ── Display shape used by both guest and authenticated paths ──────────────────

interface DisplayItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  description: string
  maxStock?: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIPPING_COST = 45.00
const FREE_SHIPPING_THRESHOLD = 5000
const TAX_RATE = 0.08

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

// ── GlowCard component ────────────────────────────────────────────────────────

function GlowCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    el.style.setProperty('--y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  return (
    <div ref={ref} className={`dynamic-glow-container ${className}`} onMouseMove={onMouseMove}>
      <div className="backlight-leak" />
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [items, setItems] = useState<DisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')

  // ── Derived totals ────────────────────────────────────────────────────────

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const shipping   = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const tax        = subtotal * TAX_RATE
  const total      = subtotal + shipping + tax
  const progress   = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)

  // ── Helpers to convert backend CartItem → DisplayItem ─────────────────────

  function toDisplayItems(backendItems: CartItem[]): DisplayItem[] {
    return backendItems.map(i => ({
      id: i.product_id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image_url ?? '',
      description: i.description,
      maxStock: i.stock_quantity,
    }))
  }

  // ── Load cart ─────────────────────────────────────────────────────────────

  const loadCart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (user) {
        const cart = await cartService.getCart()
        setItems(toDisplayItems(cart.items))
      } else {
        setItems(
          loadGuestCart().map(g => ({
            id: g.id,
            name: g.name,
            price: g.price,
            quantity: g.quantity,
            image: g.image,
            description: g.description,
          }))
        )
      }
    } catch (err) {
      setError('Failed to load cart. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadCart()
    window.scrollTo({ top: 0 })
  }, [loadCart])

  // ── Increment ─────────────────────────────────────────────────────────────

  async function increment(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return

    const newQty = item.quantity + 1
    if (item.maxStock !== undefined && newQty > item.maxStock) return

    if (user) {
      try {
        const cart = await cartService.updateItem(id, { quantity: newQty })
        setItems(toDisplayItems(cart.items))
      } catch {
        setError('Could not update quantity.')
      }
    } else {
      const updated = items.map(i => i.id === id ? { ...i, quantity: newQty } : i)
      setItems(updated)
      saveGuestCart(updated.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, description: i.description })))
    }
  }

  // ── Decrement ─────────────────────────────────────────────────────────────

  async function decrement(id: string) {
    const item = items.find(i => i.id === id)
    if (!item || item.quantity <= 1) return

    const newQty = item.quantity - 1

    if (user) {
      try {
        const cart = await cartService.updateItem(id, { quantity: newQty })
        setItems(toDisplayItems(cart.items))
      } catch {
        setError('Could not update quantity.')
      }
    } else {
      const updated = items.map(i => i.id === id ? { ...i, quantity: newQty } : i)
      setItems(updated)
      saveGuestCart(updated.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, description: i.description })))
    }
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async function remove(id: string) {
    if (user) {
      try {
        const cart = await cartService.removeItem(id)
        setItems(toDisplayItems(cart.items))
      } catch {
        setError('Could not remove item.')
      }
    } else {
      const updated = items.filter(i => i.id !== id)
      setItems(updated)
      saveGuestCart(updated.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, description: i.description })))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', color: '#e5e2e1' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'rgba(13,13,13,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: '4rem',
      }}>
        <span
          className="font-wide"
          style={{ fontSize: '1.4rem', color: '#fff', cursor: 'pointer', textTransform: 'uppercase' }}
          onClick={() => router.push('/')}
        >
          LUMEN
        </span>

        <nav style={{ display: 'flex', gap: '2.5rem', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <button style={{ color: '#a1a1a1', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => router.push('/browse')}>Explore</button>
          <button style={{ color: '#2ff801', background: 'none', border: 'none', cursor: 'pointer' }}>Cart</button>
          <button style={{ color: '#a1a1a1', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => router.push('/orders')}>Orders</button>
        </nav>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.5rem' }} onClick={() => router.push('/cart')}>
            <span className="material-symbols-outlined" style={{ color: '#a1a1a1', fontSize: '20px' }}>shopping_bag</span>
            {totalItems > 0 && (
              <span style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '10px', height: '10px', background: '#2ff801',
                borderRadius: '50%', border: '2px solid #0d0d0d',
              }} />
            )}
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} onClick={() => router.push('/login')}>
            <span className="material-symbols-outlined" style={{ color: '#a1a1a1', fontSize: '22px' }}>account_circle</span>
          </button>
        </div>
      </header>

      {/* ── Free-shipping progress bar ── */}
      <div style={{ position: 'fixed', top: '4rem', left: 0, right: 0, height: '3px', zIndex: 50, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{
          height: '100%', background: '#2ff801',
          boxShadow: '0 0 15px rgba(47,248,1,0.6)',
          width: `${progress}%`, transition: 'width 1s ease-out',
        }} />
      </div>

      {/* ── Side nav ── */}
      <aside style={{
        position: 'fixed', left: '1.5rem', top: '50%', transform: 'translateY(-50%)',
        zIndex: 50, background: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px',
        padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', alignItems: 'center',
      }}>
        {([
          { icon: 'home',         label: 'Home',    path: '/',        active: false },
          { icon: 'inventory_2',  label: 'Product', path: '/browse',  active: false },
          { icon: 'shopping_bag', label: 'Cart',    path: '/cart',    active: true  },
          { icon: 'receipt_long', label: 'Orders',  path: '/orders',  active: false },
        ] as const).map(({ icon, label, path, active }) => (
          <button key={label} onClick={() => router.push(path)} title={label}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{
              fontSize: '22px',
              color: active ? '#2ff801' : '#a1a1a1',
              filter: active ? 'drop-shadow(0 0 8px rgba(47,248,1,0.6))' : undefined,
            }}>{icon}</span>
            <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: active ? '#2ff801' : '#a1a1a1' }}>{label}</span>
          </button>
        ))}
      </aside>

      {/* ── Main ── */}
      <main style={{ paddingTop: '8rem', paddingBottom: '3rem', paddingLeft: '7rem', paddingRight: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
        <div className="cart-layout">

          {/* ── Cart items ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <h1 className="font-wide" style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, textTransform: 'uppercase' }}>
                Your Cart
              </h1>
              <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.3em', color: '#a1a1a1', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            {/* Guest banner */}
            {!user && (
              <div style={{
                padding: '1rem 1.5rem', borderRadius: '1rem',
                background: 'rgba(47,248,1,0.05)', border: '1px solid rgba(47,248,1,0.15)',
                fontSize: '11px', color: '#a1a1a1', letterSpacing: '0.05em',
              }}>
                You are browsing as a guest.{' '}
                <button
                  onClick={() => router.push('/login')}
                  style={{ color: '#2ff801', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Sign in
                </button>
                {' '}to save your cart and proceed to checkout.
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div style={{
                padding: '1rem 1.5rem', borderRadius: '1rem',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                fontSize: '11px', color: '#ef4444',
              }}>
                {error}
              </div>
            )}

            {/* Loading state */}
            {loading ? (
              <div style={{ padding: '8rem 0', textAlign: 'center', opacity: 0.4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>sync</span>
                <p className="font-wide" style={{ marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: '0.75rem' }}>Loading Cart…</p>
              </div>
            ) : (
              <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.length === 0 ? (
                  <div style={{ padding: '8rem 0', textAlign: 'center', opacity: 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '5rem', marginBottom: '2rem' }}>shopping_basket</span>
                    <p className="font-wide" style={{ textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: '0.85rem' }}>Inventory Empty</p>
                    <button
                      onClick={() => router.push('/browse')}
                      style={{ marginTop: '2rem', color: '#2ff801', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em' }}
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  items.map(item => (
                    <GlowCard key={item.id} className="rounded-[2rem]">
                      <div className="product-card glass-panel" style={{ borderRadius: '2rem', transition: 'background 0.5s' }}>
                        <div className="cart-item-inner">
                          {/* Thumbnail */}
                          <div style={{
                            width: '96px', height: '96px', borderRadius: '1rem',
                            overflow: 'hidden', flexShrink: 0,
                            border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)',
                          }}>
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt={item.name}
                                className="product-img"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#444' }}>image_not_supported</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>{item.name}</h3>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(229,226,225,0.4)', marginBottom: '0.75rem' }}>{item.description}</p>
                            {item.maxStock !== undefined && item.maxStock < 5 && item.maxStock > 0 && (
                              <p style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>
                                Only {item.maxStock} left
                              </p>
                            )}
                            <button
                              onClick={() => remove(item.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.2)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                              Remove
                            </button>
                          </div>

                          {/* Qty + Price */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '0.75rem', padding: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <button className="qty-btn" onClick={() => decrement(item.id)}
                                style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>remove</span>
                              </button>
                              <span style={{ width: '2.5rem', textAlign: 'center', fontWeight: 900, fontSize: '0.75rem', color: '#fff' }}>{item.quantity}</span>
                              <button className="qty-btn" onClick={() => increment(item.id)}
                                disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                                style={{
                                  width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', cursor: 'pointer',
                                  color: item.maxStock !== undefined && item.quantity >= item.maxStock ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',
                                }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>add</span>
                              </button>
                            </div>

                            <div style={{ minWidth: '100px', textAlign: 'right', fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                              {fmt(item.price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Order Summary ── */}
          <div className="cart-summary-col">
            <div style={{ position: 'sticky', top: '7rem' }}>
              <GlowCard className="rounded-[40px]">
                <div className="glass-panel" style={{ borderRadius: '40px', padding: '3rem' }}>
                  <h2 className="font-wide" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '3rem', color: 'rgba(255,255,255,0.9)' }}>
                    Order Summary
                  </h2>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {[
                      { label: 'Subtotal', value: fmt(subtotal), color: '#fff' },
                      { label: 'Shipping', value: shipping === 0 ? 'FREE' : fmt(shipping), color: '#2ff801' },
                      { label: 'Tax (Est.)', value: fmt(tax), color: '#fff' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2.5rem', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="font-wide" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', paddingTop: '0.75rem' }}>Total</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#2ff801', letterSpacing: '-0.02em' }}>{fmt(total)}</div>
                        <p style={{ fontSize: '9px', color: '#a1a1a1', textTransform: 'uppercase', marginTop: '0.5rem', letterSpacing: '0.2em', fontWeight: 700 }}>Incl. VAT where applicable</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Promo code */}
                    <div style={{ position: 'relative' }}>
                      <input
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                        placeholder="PROMO CODE"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: '#121212', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '1rem', padding: '1.25rem 6rem 1.25rem 1.5rem',
                          fontSize: '11px', fontWeight: 900, letterSpacing: '0.2em',
                          color: '#fff', outline: 'none', textTransform: 'uppercase',
                        }}
                      />
                      <button style={{
                        position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '10px', fontWeight: 900, color: '#2ff801', textTransform: 'uppercase',
                      }}>Apply</button>
                    </div>

                    {/* Checkout */}
                    <button
                      onClick={() => user ? router.push('/checkout') : router.push('/login')}
                      className="neon-glow"
                      disabled={items.length === 0}
                      style={{
                        width: '100%', padding: '1.5rem', borderRadius: '1rem',
                        background: items.length === 0 ? 'rgba(47,248,1,0.3)' : '#2ff801',
                        color: '#000', border: 'none', cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        boxShadow: '0 0 20px rgba(47,248,1,0.2)',
                        transition: 'filter 0.2s, transform 0.1s',
                      }}
                      onMouseEnter={e => { if (items.length > 0) e.currentTarget.style.filter = 'brightness(1.1)' }}
                      onMouseLeave={e => (e.currentTarget.style.filter = '')}
                      onMouseDown={e => { if (items.length > 0) e.currentTarget.style.transform = 'scale(0.98)' }}
                      onMouseUp={e => (e.currentTarget.style.transform = '')}
                    >
                      {user ? 'Proceed to Checkout' : 'Sign In to Checkout'}
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                    </button>

                    {/* Continue shopping */}
                    <button
                      onClick={() => router.push('/browse')}
                      style={{
                        width: '100%', padding: '1rem', background: 'none', border: 'none', cursor: 'pointer',
                        color: '#a1a1a1', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#a1a1a1')}
                    >
                      Continue Shopping
                    </button>
                  </div>

                  {/* Payment icons */}
                  <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', opacity: 0.2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>payments</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>credit_card</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>account_balance_wallet</span>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
