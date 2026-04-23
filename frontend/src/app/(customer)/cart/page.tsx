'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { cartService } from '../../../services/cartService'
import { CartItem } from '../../../types/cart'
import { SideNav } from '../../../components/layout/SideNav'

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
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

  // ── Debounce refs: track pending backend sync per item ────────────────────
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function syncToBackend(id: string, newQty: number, prevItems: DisplayItem[]) {
    if (!user) return
    clearTimeout(syncTimers.current[id])
    syncTimers.current[id] = setTimeout(async () => {
      try {
        await cartService.updateItem(id, { quantity: newQty })
      } catch {
        // revert to previous state on failure
        setItems(prevItems)
        setError('Could not update quantity.')
      }
    }, 400)
  }

  // ── Increment ─────────────────────────────────────────────────────────────

  function increment(id: string) {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      if (item.maxStock !== undefined && item.quantity >= item.maxStock) return prev
      const newQty = item.quantity + 1
      const updated = prev.map(i => i.id === id ? { ...i, quantity: newQty } : i)
      if (user) {
        syncToBackend(id, newQty, prev)
      } else {
        saveGuestCart(updated.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, description: i.description })))
      }
      return updated
    })
  }

  // ── Decrement ─────────────────────────────────────────────────────────────

  function decrement(id: string) {
    const item = items.find(i => i.id === id)
    if (item && item.quantity <= 1) { remove(id); return }
    setItems(prev => {
      const it = prev.find(i => i.id === id)
      if (!it || it.quantity <= 1) return prev
      const newQty = it.quantity - 1
      const updated = prev.map(i => i.id === id ? { ...i, quantity: newQty } : i)
      if (user) {
        syncToBackend(id, newQty, prev)
      } else {
        saveGuestCart(updated.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, description: i.description })))
      }
      return updated
    })
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async function remove(id: string) {
    // optimistic: remove from UI immediately
    const prev = items
    setItems(items.filter(i => i.id !== id))
    if (user) {
      try {
        await cartService.removeItem(id)
      } catch {
        setItems(prev)
        setError('Could not remove item.')
      }
    } else {
      const updated = items.filter(i => i.id !== id)
      saveGuestCart(updated.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, description: i.description })))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)' }}>


      <SideNav />

      {/* ── Main ── */}
      <main style={{ paddingTop: '0', paddingBottom: '3rem', paddingLeft: '9rem', paddingRight: '4rem' }}>
        <div className="cart-layout">

          {/* ── Cart items ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ paddingTop: '3rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', color: 'var(--c-neon)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '0.4rem' }}>SHOPPING</p>
                <h1 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--c-text)' }}>
                  Your Cart
                </h1>
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.15em', color: 'rgba(var(--c-text-rgb), 0.35)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            {/* Guest banner */}
            {!user && (
              <div style={{
                padding: '1rem 1.5rem', borderRadius: '1rem',
                background: 'rgba(var(--c-neon-rgb), 0.05)', border: '1px solid rgba(var(--c-neon-rgb), 0.15)',
                fontSize: '11px', color: 'rgba(var(--c-text-rgb), 0.5)', letterSpacing: '0.05em',
              }}>
                You are browsing as a guest.{' '}
                <button
                  onClick={() => router.push('/login')}
                  style={{ color: 'var(--c-neon)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
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
                      style={{ marginTop: '2rem', color: 'var(--c-neon)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em' }}
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
                            border: '1px solid rgba(var(--c-text-rgb), 0.05)', background: 'rgba(var(--c-text-rgb), 0.03)',
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
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>{item.name}</h3>
                            {item.maxStock !== undefined && item.maxStock < 5 && item.maxStock > 0 && (
                              <p style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>
                                Only {item.maxStock} left
                              </p>
                            )}
                            <button
                              onClick={() => remove(item.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(var(--c-text-rgb), 0.2)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(var(--c-text-rgb), 0.2)')}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                              Remove
                            </button>
                          </div>

                          {/* Qty + Price */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--c-panel)', borderRadius: '0.75rem', padding: '6px', border: '1px solid var(--c-panel-border)' }}>
                              <button className="qty-btn" onClick={() => decrement(item.id)}
                                style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', cursor: 'pointer', color: 'rgba(var(--c-text-rgb), 0.4)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>remove</span>
                              </button>
                              <span style={{ width: '2.5rem', textAlign: 'center', fontWeight: 900, fontSize: '0.75rem', color: 'var(--c-text)' }}>{item.quantity}</span>
                              <button className="qty-btn" onClick={() => increment(item.id)}
                                disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                                style={{
                                  width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', cursor: 'pointer',
                                  color: item.maxStock !== undefined && item.quantity >= item.maxStock ? 'rgba(var(--c-text-rgb), 0.1)' : 'rgba(var(--c-text-rgb), 0.4)',
                                }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>add</span>
                              </button>
                            </div>

                            <div style={{ minWidth: '100px', textAlign: 'right', fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-text)', letterSpacing: '-0.02em' }}>
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
                  <h2 className="font-wide" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '2rem', color: 'rgba(var(--c-text-rgb), 0.9)' }}>
                    Order Summary
                  </h2>

                  {/* Free shipping progress */}
                  <div style={{ marginBottom: '2.5rem', padding: '1.5rem', borderRadius: '1.25rem', background: shipping === 0 ? 'rgba(var(--c-neon-rgb), 0.06)' : 'rgba(var(--c-text-rgb), 0.03)', border: `1px solid ${shipping === 0 ? 'rgba(var(--c-neon-rgb), 0.2)' : 'rgba(var(--c-text-rgb), 0.06)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: shipping === 0 ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.7)' }}>
                        {shipping === 0 ? '✓ Free Shipping Unlocked!' : 'Free Shipping Progress'}
                      </span>
                      {shipping > 0 && (
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--c-neon)' }}>
                          {fmt(FREE_SHIPPING_THRESHOLD - subtotal)} away
                        </span>
                      )}
                    </div>
                    <div style={{ height: '6px', borderRadius: '9999px', background: 'rgba(var(--c-text-rgb), 0.07)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '9999px', background: 'var(--c-neon)', boxShadow: '0 0 12px rgba(var(--c-neon-rgb), 0.6)', width: `${progress}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    {shipping > 0 && (
                      <p style={{ fontSize: '12px', color: 'rgba(var(--c-text-rgb), 0.4)', marginTop: '0.75rem' }}>
                        Add <strong style={{ color: 'var(--c-text)' }}>{fmt(FREE_SHIPPING_THRESHOLD - subtotal)}</strong> more to your cart for free shipping
                      </p>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(var(--c-text-rgb), 0.05)', paddingTop: '2.5rem', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {[
                      { label: 'Subtotal', value: fmt(subtotal), color: 'var(--c-text)' },
                      { label: 'Shipping', value: shipping === 0 ? 'FREE' : fmt(shipping), color: 'var(--c-neon)' },
                      { label: 'Tax (Est.)', value: fmt(tax), color: 'var(--c-text)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(var(--c-text-rgb), 0.5)' }}>{label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(var(--c-text-rgb), 0.1)', paddingTop: '2.5rem', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="font-wide" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(var(--c-text-rgb), 0.3)', paddingTop: '0.75rem' }}>Total</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--c-neon)', letterSpacing: '-0.02em' }}>{fmt(total)}</div>
                        <p style={{ fontSize: '9px', color: 'rgba(var(--c-text-rgb), 0.5)', textTransform: 'uppercase', marginTop: '0.5rem', letterSpacing: '0.2em', fontWeight: 700 }}>Incl. VAT where applicable</p>
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
                          background: 'var(--c-panel)', border: '1px solid rgba(var(--c-text-rgb), 0.1)',
                          borderRadius: '1rem', padding: '1.25rem 6rem 1.25rem 1.5rem',
                          fontSize: '11px', fontWeight: 900, letterSpacing: '0.2em',
                          color: 'var(--c-text)', outline: 'none', textTransform: 'uppercase',
                        }}
                      />
                      <button style={{
                        position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '10px', fontWeight: 900, color: 'var(--c-neon)', textTransform: 'uppercase',
                      }}>Apply</button>
                    </div>

                    {/* Checkout */}
                    <button
                      onClick={() => user ? router.push('/checkout') : router.push('/login')}
                      className="neon-glow"
                      disabled={items.length === 0}
                      style={{
                        width: '100%', padding: '1.5rem', borderRadius: '1rem',
                        background: items.length === 0 ? 'rgba(var(--c-neon-rgb), 0.3)' : '#2ff801',
                        color: '#000', border: 'none', cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        boxShadow: '0 0 20px rgba(var(--c-neon-rgb), 0.2)',
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
                        color: 'rgba(var(--c-text-rgb), 0.5)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em',
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
