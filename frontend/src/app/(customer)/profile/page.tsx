'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import { Address, addressService } from '../../../services/addressService'
import { SideNav } from '../../../components/layout/SideNav'

const NEON = 'var(--c-neon)'
const NEON_RGB = 'var(--c-neon-rgb)'

type KnownRole = 'customer' | 'sales_manager' | 'product_manager'

function normalizeRole(role: string): KnownRole | 'other' {
  if (role === 'customer' || role === 'sales_manager' || role === 'product_manager') return role
  return 'other'
}

const ROLE_LABEL: Record<KnownRole | 'other', string> = {
  customer: 'CUSTOMER',
  sales_manager: 'SALES MANAGER',
  product_manager: 'PRODUCT MANAGER',
  other: 'USER',
}

// ── Saved Card types ──────────────────────────────────────────────────────────
interface SavedCard {
  id: string
  label: string
  last4: string
  cardType: 'visa' | 'mastercard' | 'amex' | 'other'
  expiry: string
  holderName: string
  isDefault: boolean
}

function detectCardType(num: string): SavedCard['cardType'] {
  const n = num.replace(/\D/g, '')
  if (/^4/.test(n)) return 'visa'
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  return 'other'
}

const CARD_STORAGE_KEY = 'lumen_saved_cards'

function loadCards(): SavedCard[] {
  try { return JSON.parse(localStorage.getItem(CARD_STORAGE_KEY) || '[]') } catch { return [] }
}
function saveCards(cards: SavedCard[]) {
  localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(cards))
}

function cardTypeIcon(type: SavedCard['cardType']) {
  const map: Record<SavedCard['cardType'], string> = {
    visa: 'VISA',
    mastercard: 'MC',
    amex: 'AMEX',
    other: 'CARD',
  }
  return map[type]
}

// ── Input style helper ────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(var(--c-text-rgb), 0.04)',
  border: '1px solid rgba(var(--c-text-rgb), 0.10)',
  borderRadius: '0.5rem',
  padding: '0.65rem 0.85rem',
  color: 'var(--c-text)',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  letterSpacing: '0.2em',
  color: 'rgba(var(--c-text-rgb), 0.4)',
  fontFamily: 'Space Grotesk, sans-serif',
  marginBottom: '0.35rem',
  fontWeight: 600,
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--c-panel)',
  border: '1px solid var(--c-panel-border)',
  borderRadius: '1.25rem',
  padding: '2rem',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  letterSpacing: '0.3em',
  color: 'var(--c-neon)',
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 700,
  textTransform: 'uppercase',
  marginBottom: '1.25rem',
}

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const roleKey = useMemo(() => (user ? normalizeRole(user.role) : 'other'), [user])

  // ── Addresses ─────────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrError, setAddrError] = useState<string | null>(null)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newFull, setNewFull] = useState('')
  const [newDefault, setNewDefault] = useState(false)
  const [savingAddr, setSavingAddr] = useState(false)

  // ── Cards ─────────────────────────────────────────────────────────────────
  const [cards, setCards] = useState<SavedCard[]>([])
  const [showCardForm, setShowCardForm] = useState(false)
  const [cardLabel, setCardLabel] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [cardDefault, setCardDefault] = useState(false)

  // ── Banner ────────────────────────────────────────────────────────────────
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // ── Auth redirect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.replace(ROUTES.LOGIN)
  }, [user, isLoading, router])

  // ── Load addresses ────────────────────────────────────────────────────────
  const loadAddresses = useCallback(async () => {
    if (!user?.token) return
    setAddrLoading(true)
    setAddrError(null)
    try {
      const data = await addressService.getAddresses(user.token)
      setAddresses(data)
    } catch (err) {
      setAddrError(err instanceof Error ? err.message : 'Failed to load addresses.')
    } finally {
      setAddrLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    if (!isLoading && user) {
      loadAddresses()
      setCards(loadCards())
    }
  }, [isLoading, user, loadAddresses])

  // ── Add address ───────────────────────────────────────────────────────────
  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.token) return
    if (!newLabel.trim() || !newFull.trim()) {
      setBanner({ type: 'error', msg: 'Label and address are required.' })
      return
    }
    setSavingAddr(true)
    try {
      await addressService.addAddress(user.token, {
        label: newLabel.trim(),
        full_address: newFull.trim(),
        is_default: newDefault || addresses.length === 0,
      })
      setBanner({ type: 'success', msg: 'Address saved.' })
      setNewLabel(''); setNewFull(''); setNewDefault(false); setShowAddrForm(false)
      await loadAddresses()
    } catch (err) {
      setBanner({ type: 'error', msg: err instanceof Error ? err.message : 'Failed to save address.' })
    } finally {
      setSavingAddr(false)
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!user?.token) return
    try {
      await addressService.deleteAddress(user.token, id)
      setAddresses(prev => prev.filter(a => a.id !== id))
      setBanner({ type: 'success', msg: 'Address removed.' })
    } catch (err) {
      setBanner({ type: 'error', msg: err instanceof Error ? err.message : 'Failed to delete.' })
    }
  }

  async function handleSetDefaultAddress(id: string) {
    if (!user?.token) return
    try {
      const updated = await addressService.setDefault(user.token, id)
      setAddresses(updated)
    } catch (err) {
      setBanner({ type: 'error', msg: err instanceof Error ? err.message : 'Failed to update.' })
    }
  }

  // ── Add card ──────────────────────────────────────────────────────────────
  function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    const digits = cardNumber.replace(/\D/g, '')
    if (digits.length < 13) { setBanner({ type: 'error', msg: 'Enter a valid card number.' }); return }
    if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) { setBanner({ type: 'error', msg: 'Expiry must be MM/YY.' }); return }
    if (!cardHolder.trim()) { setBanner({ type: 'error', msg: 'Cardholder name is required.' }); return }

    const newCard: SavedCard = {
      id: Date.now().toString(),
      label: cardLabel.trim() || 'My Card',
      last4: digits.slice(-4),
      cardType: detectCardType(digits),
      expiry: cardExpiry,
      holderName: cardHolder.trim(),
      isDefault: cardDefault || cards.length === 0,
    }
    const updated = cardDefault || cards.length === 0
      ? cards.map(c => ({ ...c, isDefault: false })).concat(newCard)
      : [...cards, newCard]
    saveCards(updated)
    setCards(updated)
    setBanner({ type: 'success', msg: 'Card saved.' })
    setCardLabel(''); setCardNumber(''); setCardExpiry(''); setCardHolder(''); setCardDefault(false); setShowCardForm(false)
  }

  function handleDeleteCard(id: string) {
    const updated = cards.filter(c => c.id !== id)
    saveCards(updated)
    setCards(updated)
    setBanner({ type: 'success', msg: 'Card removed.' })
  }

  function handleSetDefaultCard(id: string) {
    const updated = cards.map(c => ({ ...c, isDefault: c.id === id }))
    saveCards(updated)
    setCards(updated)
  }

  function handleLogout() {
    logout()
    router.replace(ROUTES.LOGIN)
  }

  if (isLoading) {
    return (
      <div className="atmospheric-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em' }}>
        LOADING...
      </div>
    )
  }

  if (!user) return null

  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.first_name || user.email.split('@')[0]

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)', fontFamily: 'Inter, sans-serif' }}>
      <SideNav />
      <main style={{ position: 'relative', zIndex: 10, paddingBottom: '6rem', paddingLeft: '9rem', paddingRight: '2rem', maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ paddingTop: '3rem', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>ACCOUNT</p>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.02em' }}>
            {displayName.toUpperCase()}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(var(--c-text-rgb), 0.35)', marginTop: '0.25rem', letterSpacing: '0.1em' }}>{user.email}</p>
        </div>

        {/* Banner */}
        {banner && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', background: banner.type === 'success' ? `rgba(${NEON_RGB}, 0.08)` : 'rgba(239,68,68,0.08)', border: `1px solid ${banner.type === 'success' ? `rgba(${NEON_RGB}, 0.25)` : 'rgba(239,68,68,0.4)'}`, borderRadius: '0.75rem' }}>
            <span style={{ color: banner.type === 'success' ? NEON : '#f87171', fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.8rem', letterSpacing: '0.1em' }}>{banner.msg}</span>
            <button onClick={() => setBanner(null)} style={{ color: 'rgba(var(--c-text-rgb), 0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Account Info */}
          <section style={sectionStyle}>
            <p style={sectionTitleStyle}>Account Info</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'EMAIL', value: user.email },
                { label: 'NAME', value: `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—' },
                { label: 'ROLE', value: ROLE_LABEL[roleKey] },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--c-panel-border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(var(--c-text-rgb), 0.4)', letterSpacing: '0.2em', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--c-text)', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section style={sectionStyle}>
            <p style={sectionTitleStyle}>Quick Actions</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {[
                { label: 'Browse', href: ROUTES.BROWSE },
                { label: 'Cart', href: ROUTES.CART },
                { label: 'Orders', href: ROUTES.ORDERS },
                ...(roleKey === 'sales_manager' ? [{ label: 'Sales Dashboard', href: ROUTES.SALES_DASHBOARD }] : []),
                ...(roleKey === 'product_manager' ? [{ label: 'Product Dashboard', href: ROUTES.PRODUCT_DASHBOARD }] : []),
              ].map(action => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: `1px solid rgba(${NEON_RGB}, 0.20)`, background: `rgba(${NEON_RGB}, 0.05)`, color: NEON, fontSize: '0.75rem', letterSpacing: '0.15em', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }}
                >
                  {action.label.toUpperCase()}
                </Link>
              ))}
            </div>
          </section>

          {/* Delivery Addresses */}
          <section style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p style={sectionTitleStyle}>Delivery Addresses</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.05em', marginTop: '-0.75rem' }}>Auto-filled at checkout</p>
              </div>
              <button
                onClick={() => setShowAddrForm(v => !v)}
                style={{ padding: '0.5rem 1.25rem', border: `1px solid rgba(${NEON_RGB}, 0.30)`, color: NEON, fontSize: '0.7rem', letterSpacing: '0.2em', background: showAddrForm ? `rgba(${NEON_RGB}, 0.10)` : 'none', cursor: 'pointer', borderRadius: '0.4rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}
              >
                {showAddrForm ? 'CANCEL' : '+ ADD ADDRESS'}
              </button>
            </div>

            {/* Add address form */}
            {showAddrForm && (
              <form onSubmit={handleAddAddress} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(var(--c-text-rgb), 0.03)', border: '1px solid rgba(var(--c-text-rgb), 0.08)', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>LABEL (e.g. Home, Work)</label>
                    <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Home" maxLength={50} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
                    <input type="checkbox" checked={newDefault} onChange={e => setNewDefault(e.target.checked)} style={{ accentColor: NEON }} />
                    <label style={{ fontSize: '0.75rem', color: 'rgba(var(--c-text-rgb), 0.5)', fontFamily: 'Space Grotesk, sans-serif' }}>Set as default</label>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>FULL ADDRESS</label>
                  <textarea value={newFull} onChange={e => setNewFull(e.target.value)} rows={2} placeholder="Street, city, postal code, country" maxLength={300} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <button type="submit" disabled={savingAddr} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem', background: NEON, color: '#000', border: 'none', borderRadius: '0.4rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.2em', cursor: savingAddr ? 'not-allowed' : 'pointer', opacity: savingAddr ? 0.6 : 1 }}>
                  {savingAddr ? 'SAVING...' : 'SAVE ADDRESS'}
                </button>
              </form>
            )}

            {/* Address list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {addrLoading ? (
                <p style={{ fontSize: '0.8rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.1em' }}>LOADING...</p>
              ) : addrError ? (
                <p style={{ fontSize: '0.8rem', color: '#f87171' }}>{addrError}</p>
              ) : addresses.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.1em' }}>NO SAVED ADDRESSES YET</p>
              ) : (
                addresses.map(addr => (
                  <div key={addr.id} style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', border: `1px solid ${addr.is_default ? `rgba(${NEON_RGB}, 0.20)` : 'var(--c-panel-border)'}`, background: addr.is_default ? `rgba(${NEON_RGB}, 0.05)` : 'rgba(var(--c-text-rgb), 0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)', fontFamily: 'Space Grotesk, sans-serif' }}>{addr.label}</span>
                        {addr.is_default && <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', padding: '0.15rem 0.5rem', borderRadius: '9999px', border: `1px solid rgba(${NEON_RGB}, 0.25)`, background: `rgba(${NEON_RGB}, 0.06)`, color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>DEFAULT</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {!addr.is_default && (
                          <button onClick={() => handleSetDefaultAddress(addr.id)} style={{ fontSize: '0.7rem', color: 'rgba(var(--c-text-rgb), 0.4)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif' }}>SET DEFAULT</button>
                        )}
                        <button onClick={() => handleDeleteAddress(addr.id)} style={{ fontSize: '0.7rem', color: 'rgba(239,68,68,0.6)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif' }}>REMOVE</button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(var(--c-text-rgb), 0.5)' }}>{addr.full_address}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Saved Cards */}
          <section style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p style={sectionTitleStyle}>Saved Cards</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.05em', marginTop: '-0.75rem' }}>For faster checkout</p>
              </div>
              <button
                onClick={() => setShowCardForm(v => !v)}
                style={{ padding: '0.5rem 1.25rem', border: `1px solid rgba(${NEON_RGB}, 0.30)`, color: NEON, fontSize: '0.7rem', letterSpacing: '0.2em', background: showCardForm ? `rgba(${NEON_RGB}, 0.10)` : 'none', cursor: 'pointer', borderRadius: '0.4rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}
              >
                {showCardForm ? 'CANCEL' : '+ ADD CARD'}
              </button>
            </div>

            {/* Add card form */}
            {showCardForm && (
              <form onSubmit={handleAddCard} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(var(--c-text-rgb), 0.03)', border: '1px solid rgba(var(--c-text-rgb), 0.08)', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>CARD NICKNAME</label>
                    <input value={cardLabel} onChange={e => setCardLabel(e.target.value)} placeholder="Personal Visa" maxLength={40} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>CARDHOLDER NAME</label>
                    <input value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="John Doe" maxLength={60} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>CARD NUMBER</label>
                    <input
                      value={cardNumber}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
                        setCardNumber(raw.replace(/(.{4})/g, '$1 ').trim())
                      }}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>EXPIRY (MM/YY)</label>
                    <input
                      value={cardExpiry}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2)
                        setCardExpiry(v)
                      }}
                      placeholder="MM/YY"
                      maxLength={5}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={cardDefault} onChange={e => setCardDefault(e.target.checked)} style={{ accentColor: NEON }} />
                  <label style={{ fontSize: '0.75rem', color: 'rgba(var(--c-text-rgb), 0.5)', fontFamily: 'Space Grotesk, sans-serif' }}>Set as default</label>
                </div>
                <button type="submit" style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem', background: NEON, color: '#000', border: 'none', borderRadius: '0.4rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.2em', cursor: 'pointer' }}>
                  SAVE CARD
                </button>
              </form>
            )}

            {/* Card list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cards.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.1em' }}>NO SAVED CARDS YET</p>
              ) : (
                cards.map(card => (
                  <div key={card.id} style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', border: `1px solid ${card.isDefault ? `rgba(${NEON_RGB}, 0.20)` : 'var(--c-panel-border)'}`, background: card.isDefault ? `rgba(${NEON_RGB}, 0.05)` : 'rgba(var(--c-text-rgb), 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '3rem', height: '2rem', background: 'rgba(var(--c-text-rgb), 0.06)', border: '1px solid rgba(var(--c-text-rgb), 0.12)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: NEON, letterSpacing: '0.05em', fontFamily: 'Space Grotesk, sans-serif' }}>{cardTypeIcon(card.cardType)}</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)', fontFamily: 'Space Grotesk, sans-serif' }}>{card.label}</span>
                          {card.isDefault && <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', padding: '0.15rem 0.5rem', borderRadius: '9999px', border: `1px solid rgba(${NEON_RGB}, 0.25)`, background: `rgba(${NEON_RGB}, 0.06)`, color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>DEFAULT</span>}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(var(--c-text-rgb), 0.4)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.1em' }}>
                          •••• •••• •••• {card.last4} &nbsp;|&nbsp; {card.expiry}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'rgba(var(--c-text-rgb), 0.3)', marginTop: '0.1rem' }}>{card.holderName}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                      {!card.isDefault && (
                        <button onClick={() => handleSetDefaultCard(card.id)} style={{ fontSize: '0.7rem', color: 'rgba(var(--c-text-rgb), 0.4)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif' }}>SET DEFAULT</button>
                      )}
                      <button onClick={() => handleDeleteCard(card.id)} style={{ fontSize: '0.7rem', color: 'rgba(239,68,68,0.6)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif' }}>REMOVE</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem' }}>
            <Link href={ROUTES.HOME} style={{ fontSize: '0.75rem', color: 'rgba(var(--c-text-rgb), 0.35)', textDecoration: 'none', letterSpacing: '0.15em', fontFamily: 'Space Grotesk, sans-serif' }}>← BACK TO HOME</Link>
            <button
              onClick={handleLogout}
              style={{ padding: '0.6rem 1.5rem', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.7rem', letterSpacing: '0.2em', borderRadius: '0.4rem', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}
            >
              SIGN OUT
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
