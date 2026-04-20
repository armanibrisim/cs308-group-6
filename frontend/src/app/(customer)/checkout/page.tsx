'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { SideNav } from '../../../components/layout/SideNav'
import { useAuth } from '../../../context/AuthContext'
import { cartService } from '../../../services/cartService'
import {
  checkoutService,
  CheckoutInvoice,
  CheckoutPayload,
  CheckoutResult,
} from '../../../services/checkoutService'
import { Address, addressService } from '../../../services/addressService'
import { CartItem } from '../../../types/cart'

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIPPING_COST = 45.00
const FREE_SHIPPING_THRESHOLD = 5000
const TAX_RATE = 0.08

function fmt(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

// ── Shared style constants ────────────────────────────────────────────────────

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  color: 'rgba(var(--c-text-rgb), 0.6)',
  marginBottom: '0.5rem',
  letterSpacing: '0.05em',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(var(--c-text-rgb), 0.07)',
  border: '1px solid rgba(var(--c-text-rgb), 0.18)',
  borderRadius: '0.75rem',
  padding: '1rem',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  color: 'var(--c-text)',
  outline: 'none',
}

// ── Cart item shape used only in this page ────────────────────────────────────

interface DisplayItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  invoice,
  onContinue,
}: {
  invoice: CheckoutInvoice
  onContinue: () => void
}) {
  return (
    <div className="atmospheric-bg" style={{
      minHeight: '100vh',
      color: 'var(--c-text)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4rem 2rem',
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: '900px', width: '100%' }}>

        {/* Confirmation header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'var(--c-neon)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 0 24px rgba(var(--c-neon-rgb), 0.5)',
          }}>
            <span
              className="material-symbols-outlined"
              style={{ color: '#022100', fontSize: '2.5rem', fontVariationSettings: '"wght" 700' }}
            >
              check
            </span>
          </div>
          <h1 style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.4em',
            color: 'var(--c-neon)',
            marginBottom: '0.5rem',
          }}>
            Payment Confirmed
          </h1>
          <p style={{ color: 'rgba(var(--c-text-rgb), 0.6)', fontSize: '12px', fontFamily: 'monospace' }}>
            TRANSACTION ID: #{invoice.id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Invoice card */}
        <div style={{
          background: 'var(--c-panel)',
          border: '1px solid rgba(var(--c-text-rgb), 0.08)',
          borderRadius: '1.25rem',
          padding: '3rem',
          marginBottom: '2rem',
          position: 'relative',
        }}>
          {/* Green accent bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(to right, var(--c-neon), rgba(var(--c-neon-rgb), 0.4))',
          }} />

          {/* From / Bill To */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem',
            marginBottom: '3rem',
          }}>
            <div>
              <div style={{ color: 'var(--c-neon)', fontSize: '20px', fontWeight: 900, marginBottom: '1rem' }}>
                LUMEN
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.6)', lineHeight: 1.8 }}>
                SUPPORT@LUMEN.TECH
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: '1rem',
              }}>
                Bill To
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.6)', lineHeight: 1.8 }}>
                {invoice.customer_name.toUpperCase()}<br />
                {invoice.customer_email.toUpperCase()}<br />
                {invoice.delivery_address.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', fontFamily: 'monospace', marginBottom: '2rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)' }}>
                <th style={{ textAlign: 'left', paddingBottom: '1rem', fontSize: '10px', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.6)', fontWeight: 500 }}>
                  Description
                </th>
                <th style={{ textAlign: 'center', paddingBottom: '1rem', fontSize: '10px', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.6)', fontWeight: 500 }}>
                  Qty
                </th>
                <th style={{ textAlign: 'right', paddingBottom: '1rem', fontSize: '10px', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.6)', fontWeight: 500 }}>
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(53,53,52,0.5)' }}>
                  <td style={{ padding: '1.25rem 0', fontSize: '12px' }}>
                    {item.product_name.toUpperCase()}
                  </td>
                  <td style={{ padding: '1.25rem 0', textAlign: 'center', fontSize: '12px' }}>
                    {String(item.quantity).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '1.25rem 0', textAlign: 'right', fontSize: '12px' }}>
                    {fmt(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid rgba(var(--c-text-rgb), 0.07)' }}>
                <td colSpan={2} style={{ paddingTop: '1.25rem', fontSize: '10px', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.6)' }}>
                  Subtotal
                </td>
                <td style={{ paddingTop: '1.25rem', textAlign: 'right', fontSize: '12px' }}>
                  {fmt(invoice.subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ paddingTop: '0.5rem', fontSize: '10px', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.6)' }}>
                  Shipping + Tax
                </td>
                <td style={{ paddingTop: '0.5rem', textAlign: 'right', fontSize: '12px' }}>
                  {fmt(invoice.shipping + invoice.tax)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ paddingTop: '1.25rem', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--c-neon)' }}>
                  Total Paid
                </td>
                <td style={{ paddingTop: '1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--c-neon)', fontSize: '20px' }}>
                  {fmt(invoice.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style={{
            textAlign: 'center',
            padding: '1rem',
            background: 'rgba(var(--c-text-rgb), 0.04)',
            borderRadius: '0.75rem',
            fontSize: '0.7rem',
            fontFamily: 'Space Grotesk, sans-serif',
            letterSpacing: '0.1em',
            color: 'rgba(var(--c-text-rgb), 0.4)',
          }}>
            INVOICE SENT TO {invoice.customer_email.toUpperCase()} — THANK YOU FOR YOUR ACQUISITION.
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1,
            background: 'rgba(var(--c-text-rgb), 0.04)',
            border: '1px solid rgba(var(--c-text-rgb), 0.07)',
            borderRadius: '0.75rem',
            color: 'rgba(var(--c-text-rgb), 0.5)',
            padding: '1rem 2rem',
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '11px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: 0.6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
            Invoice Sent to Email
          </div>
          <button
            onClick={onContinue}
            style={{
              flex: 1,
              background: 'var(--c-neon)',
              color: '#022100',
              border: 'none',
              padding: '1rem 2rem',
              fontFamily: 'monospace',
              fontSize: '11px',
              textTransform: 'uppercase',
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'filter 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.filter = '')}
          >
            Continue Shopping
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Checkout Page ─────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  // Cart data
  const [cartItems, setCartItems] = useState<DisplayItem[]>([])
  const [cartLoading, setCartLoading] = useState(true)
  const [cartError, setCartError] = useState<string | null>(null)

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

  // Delivery form fields (used when entering manually)
  const [address, setAddress] = useState('')
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [newAddressLabel, setNewAddressLabel] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)

  // Card form fields
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')

  // Checkout state
  const [processing, setProcessing] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckoutResult | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load cart from backend
  const loadCart = useCallback(async () => {
    if (!user) return
    setCartLoading(true)
    setCartError(null)
    try {
      const cart = await cartService.getCart()
      setCartItems(
        cart.items.map((i: CartItem) => ({
          id: i.product_id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image_url ?? '',
        }))
      )
    } catch {
      setCartError('Failed to load cart.')
    } finally {
      setCartLoading(false)
    }
  }, [user])

  // Load saved addresses
  useEffect(() => {
    if (!user?.token) return
    addressService.getAddresses(user.token).then(data => {
      setSavedAddresses(data)
      const def = data.find(a => a.is_default)
      if (def) setSelectedAddressId(def.id)
    }).catch(() => {/* ignore — user may have no addresses */})
  }, [user?.token])

  useEffect(() => {
    loadCart()
    window.scrollTo({ top: 0 })
  }, [loadCart])

  // Derived totals (mirrors backend logic)
  const subtotal = Math.round(cartItems.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + shipping + tax) * 100) / 100

  // Card number formatting: groups of 4 digits
  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16)
    const parts: string[] = []
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4))
    }
    setCardNumber(parts.join(' '))
  }

  // Expiry formatting: MM/YY
  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits)
  }

  // Resolve final delivery address string
  function resolveDeliveryAddress(): string | null {
    if (selectedAddressId) {
      const saved = savedAddresses.find(a => a.id === selectedAddressId)
      if (saved) return saved.full_address
    }
    // Manual form
    if (savedAddresses.length === 0 || showManualForm) {
      if (!address.trim()) return null
      return address.trim()
    }
    return null
  }

  // Place order handler
  async function handlePlaceOrder() {
    setCheckoutError(null)

    const deliveryAddress = resolveDeliveryAddress()
    if (!deliveryAddress) {
      setCheckoutError('Please select a saved address or fill in the delivery address fields.')
      return
    }
    const rawCard = cardNumber.replace(/\s/g, '')
    if (rawCard.length !== 16) {
      setCheckoutError('Please enter a valid 16-digit card number.')
      return
    }
    if (!cardHolder.trim()) {
      setCheckoutError('Please enter the name on your card.')
      return
    }
    if (expiry.length !== 5) {
      setCheckoutError('Please enter a valid expiry date (MM/YY).')
      return
    }
    if (cvv.length !== 3) {
      setCheckoutError('Please enter a valid 3-digit CVV.')
      return
    }

    const payload: CheckoutPayload = {
      delivery_address: deliveryAddress!,
      card_last4: rawCard.slice(-4),
      card_holder_name: cardHolder.trim(),
    }

    // Save new address to account if requested
    if (!selectedAddressId && saveNewAddress && user?.token) {
      const label = newAddressLabel.trim() || 'Saved Address'
      const fullAddr = address.trim()
      try {
        const saved = await addressService.addAddress(user.token, {
          label,
          full_address: fullAddr,
          is_default: savedAddresses.length === 0,
        })
        setSavedAddresses(prev => [...prev, saved])
      } catch {
        // Non-fatal — proceed with checkout even if save fails
      }
    }

    setProcessing(true)
    try {
      const checkoutResult = await checkoutService.placeOrder(payload)
      setResult(checkoutResult)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Payment failed. Please try again.'
      )
    } finally {
      setProcessing(false)
    }
  }

  // Show success/invoice screen after successful checkout
  if (result) {
    return (
      <SuccessScreen
        invoice={result.invoice}
        onContinue={() => router.push('/browse')}
      />
    )
  }

  // Waiting for auth check or redirect in progress
  if (authLoading || !user) return null

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)' }}>
      <SideNav />

      <main style={{ paddingLeft: '9rem', paddingRight: '4rem', paddingTop: '3rem', paddingBottom: '5rem' }}>

        {/* Checkout progress bar — 75% filled (payment step) */}
        <div style={{ width: '100%', height: '2px', background: 'rgba(var(--c-text-rgb), 0.06)', marginBottom: '3rem', overflow: 'hidden' }}>
          <div style={{ width: '75%', height: '100%', background: 'linear-gradient(to right, var(--c-neon), rgba(var(--c-neon-rgb), 0.4))' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '3rem', maxWidth: '1400px', margin: '0 auto', alignItems: 'start' }}>

          {/* ── LEFT: Order Summary ──────────────────────────────────────────── */}
          <section className="grounded-box" style={{ borderRadius: '1.5rem', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(var(--c-text-rgb), 0.6)', marginBottom: '2rem' }}>
              Order Summary
            </h2>

            {cartLoading ? (
              <div style={{ padding: '4rem 0', textAlign: 'center', opacity: 0.4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>sync</span>
                <p style={{ marginTop: '1rem', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                  Loading…
                </p>
              </div>
            ) : cartError ? (
              <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px', color: '#ef4444', fontFamily: 'monospace' }}>
                {cartError}
              </div>
            ) : cartItems.length === 0 ? (
              <div style={{ padding: '4rem 0', textAlign: 'center', opacity: 0.4 }}>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                  Your cart is empty
                </p>
                <button
                  onClick={() => router.push('/browse')}
                  style={{ marginTop: '1rem', color: 'var(--c-neon)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em' }}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cartItems.map(item => (
                  <div key={item.id} style={{ background: 'rgba(var(--c-text-rgb), 0.03)', border: '1px solid rgba(var(--c-text-rgb), 0.06)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ width: '96px', height: '96px', background: 'rgba(var(--c-text-rgb), 0.04)', borderRadius: '0.75rem', flexShrink: 0, overflow: 'hidden' }}>
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: '#444' }}>image_not_supported</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.6)', marginBottom: '1rem' }}>
                        QTY: {String(item.quantity).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                        {fmt(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(var(--c-text-rgb), 0.07)' }}>
              {[
                { label: 'Subtotal', value: fmt(subtotal) },
                { label: 'Shipping', value: shipping === 0 ? 'FREE' : fmt(shipping) },
                { label: 'Tax', value: fmt(tax) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.6)' }}>
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--c-neon)', letterSpacing: '-0.02em' }}>
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </section>

          {/* ── RIGHT: Delivery + Payment form ──────────────────────────────── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Section 01: Delivery Address */}
            <div className="grounded-box" style={{ borderRadius: '1.5rem', padding: '2.5rem' }}>
              <h2 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(var(--c-text-rgb), 0.6)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(var(--c-text-rgb), 0.06)', border: '1px solid rgba(var(--c-text-rgb), 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(var(--c-text-rgb), 0.6)', flexShrink: 0 }}>01</span>
                Delivery Address
              </h2>

              {/* Saved address cards */}
              {savedAddresses.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ ...LABEL_STYLE, marginBottom: '1rem' }}>Saved addresses</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {savedAddresses.map(addr => {
                      const active = selectedAddressId === addr.id
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => { setSelectedAddressId(active ? null : addr.id); setShowManualForm(false) }}
                          style={{
                            textAlign: 'left', background: active ? 'rgba(var(--c-neon-rgb), 0.07)' : 'rgba(var(--c-text-rgb), 0.03)',
                            borderRadius: '0.75rem',
                            border: `1px solid ${active ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.07)'}`,
                            padding: '1rem 1.25rem', cursor: 'pointer',
                            transition: 'border-color 0.2s, background 0.2s',
                            boxShadow: active ? `0 0 8px rgba(var(--c-neon-rgb), 0.15)` : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                            <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${active ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.3)'}`, background: active ? 'var(--c-neon)' : 'transparent', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: active ? 'var(--c-neon)' : 'var(--c-text)' }}>
                              {addr.label}
                              {addr.is_default && <span style={{ marginLeft: '0.5rem', fontSize: '9px', color: 'var(--c-neon)', opacity: 0.7 }}>DEFAULT</span>}
                            </span>
                          </div>
                          <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.6)', marginLeft: '1.65rem', lineHeight: 1.5 }}>
                            {addr.full_address}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(var(--c-text-rgb), 0.07)' }} />
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.5)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(var(--c-text-rgb), 0.07)' }} />
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => { setShowManualForm(v => !v); setSelectedAddressId(null) }}
                    style={{
                      width: '100%',
                      background: showManualForm ? 'transparent' : `rgba(var(--c-neon-rgb), 0.08)`,
                      border: `1px solid ${showManualForm ? 'rgba(var(--c-text-rgb), 0.07)' : 'var(--c-neon)'}`,
                      color: showManualForm ? 'rgba(var(--c-text-rgb), 0.5)' : 'var(--c-neon)',
                      padding: '0.85rem 1.5rem',
                      borderRadius: '0.75rem',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => { if (!showManualForm) e.currentTarget.style.background = `rgba(var(--c-neon-rgb), 0.14)` }}
                    onMouseLeave={e => { if (!showManualForm) e.currentTarget.style.background = `rgba(var(--c-neon-rgb), 0.08)` }}
                  >
                    {showManualForm
                      ? '× Cancel new address'
                      : '+ Enter a new address'}
                  </button>
                </div>
              )}

              {/* Manual address fields */}
              {(savedAddresses.length === 0 || showManualForm) && !selectedAddressId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={LABEL_STYLE}>Label (e.g. Home, Work)</label>
                    <input
                      type="text"
                      value={newAddressLabel}
                      onChange={e => setNewAddressLabel(e.target.value)}
                      placeholder="HOME"
                      maxLength={50}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Full Address</label>
                    <textarea
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="STREET, CITY, POSTAL CODE, COUNTRY"
                      maxLength={300}
                      rows={3}
                      style={{ ...INPUT_STYLE, resize: 'none' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={e => setSaveNewAddress(e.target.checked)}
                      style={{ accentColor: 'var(--c-neon)', width: '14px', height: '14px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Save this address to my account
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Section 02: Card Information */}
            <div className="grounded-box" style={{ borderRadius: '1.5rem', padding: '2.5rem' }}>
              <h2 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(var(--c-text-rgb), 0.6)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(var(--c-text-rgb), 0.06)', border: '1px solid rgba(var(--c-text-rgb), 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(var(--c-text-rgb), 0.6)', flexShrink: 0 }}>
                  02
                </span>
                Card Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                  <label style={LABEL_STYLE}>Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    style={{ ...INPUT_STYLE, paddingRight: '3rem' }}
                  />
                  <span
                    className="material-symbols-outlined"
                    style={{ position: 'absolute', right: '1rem', bottom: '1rem', color: 'rgba(var(--c-text-rgb), 0.6)', fontSize: '20px' }}
                  >
                    credit_card
                  </span>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Name on Card</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={e => setCardHolder(e.target.value)}
                    placeholder="JOHN DOE"
                    style={INPUT_STYLE}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={LABEL_STYLE}>Expiry MM/YY</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={handleExpiryChange}
                      placeholder="12/28"
                      maxLength={5}
                      style={{ ...INPUT_STYLE, textAlign: 'center' }}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>CVV</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="000"
                      maxLength={3}
                      style={{ ...INPUT_STYLE, textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {checkoutError && (
              <div style={{ padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px', color: '#ef4444', fontFamily: 'monospace' }}>
                {checkoutError}
              </div>
            )}

            {/* Place Order CTA */}
            <div>
              <button
                onClick={handlePlaceOrder}
                disabled={processing || cartItems.length === 0}
                style={{
                  width: '100%',
                  background: processing || cartItems.length === 0 ? `rgba(var(--c-neon-rgb), 0.4)` : 'var(--c-neon)',
                  color: '#022100',
                  border: 'none',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: 900,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  cursor: processing || cartItems.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: `0 0 20px rgba(var(--c-neon-rgb), 0.2)`,
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={e => { if (!processing && cartItems.length > 0) e.currentTarget.style.filter = 'brightness(1.1)' }}
                onMouseLeave={e => (e.currentTarget.style.filter = '')}
              >
                {processing ? (
                  <span style={{ opacity: 0.8 }}>Processing…</span>
                ) : (
                  <>
                    <span>Place Order</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                  </>
                )}
              </button>
              <p style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.45)', marginTop: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                By placing your order, you agree to our Terms of Acquisition.
              </p>
            </div>

          </section>
        </div>
      </main>
    </div>
  )
}
