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
  color: '#c4c7c7',
  marginBottom: '0.5rem',
  letterSpacing: '0.05em',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#2a2a2a',
  border: 'none',
  padding: '1rem',
  fontSize: '13px',
  fontFamily: 'monospace',
  color: '#e5e2e1',
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
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#e5e2e1',
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
            background: '#2ff801',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 0 24px rgba(47,248,1,0.5)',
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
            color: '#2ff801',
            marginBottom: '0.5rem',
          }}>
            Payment Confirmed
          </h1>
          <p style={{ color: '#c4c7c7', fontSize: '12px', fontFamily: 'monospace' }}>
            TRANSACTION ID: #{invoice.id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Invoice card */}
        <div style={{
          background: '#1c1b1b',
          border: '1px solid #353534',
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
            background: 'linear-gradient(to right, #2ae500, #d7ffc5)',
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
              <div style={{ color: '#00FF41', fontSize: '20px', fontWeight: 900, marginBottom: '1rem' }}>
                LUMEN
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#c4c7c7', lineHeight: 1.8 }}>
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
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#c4c7c7', lineHeight: 1.8 }}>
                {invoice.customer_name.toUpperCase()}<br />
                {invoice.customer_email.toUpperCase()}<br />
                {invoice.delivery_address.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', fontFamily: 'monospace', marginBottom: '2rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #353534' }}>
                <th style={{ textAlign: 'left', paddingBottom: '1rem', fontSize: '10px', textTransform: 'uppercase', color: '#c4c7c7', fontWeight: 500 }}>
                  Description
                </th>
                <th style={{ textAlign: 'center', paddingBottom: '1rem', fontSize: '10px', textTransform: 'uppercase', color: '#c4c7c7', fontWeight: 500 }}>
                  Qty
                </th>
                <th style={{ textAlign: 'right', paddingBottom: '1rem', fontSize: '10px', textTransform: 'uppercase', color: '#c4c7c7', fontWeight: 500 }}>
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
              <tr style={{ borderTop: '1px solid #353534' }}>
                <td colSpan={2} style={{ paddingTop: '1.25rem', fontSize: '10px', textTransform: 'uppercase', color: '#c4c7c7' }}>
                  Subtotal
                </td>
                <td style={{ paddingTop: '1.25rem', textAlign: 'right', fontSize: '12px' }}>
                  {fmt(invoice.subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ paddingTop: '0.5rem', fontSize: '10px', textTransform: 'uppercase', color: '#c4c7c7' }}>
                  Shipping + Tax
                </td>
                <td style={{ paddingTop: '0.5rem', textAlign: 'right', fontSize: '12px' }}>
                  {fmt(invoice.shipping + invoice.tax)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ paddingTop: '1.25rem', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#00FF41' }}>
                  Total Paid
                </td>
                <td style={{ paddingTop: '1.25rem', textAlign: 'right', fontWeight: 700, color: '#00FF41', fontSize: '20px' }}>
                  {fmt(invoice.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style={{
            textAlign: 'center',
            padding: '1rem',
            background: '#201f1f',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#c4c7c7',
          }}>
            INVOICE SENT TO {invoice.customer_email.toUpperCase()} — THANK YOU FOR YOUR ACQUISITION.
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1,
            background: '#2a2a2a',
            color: '#c6c6c7',
            padding: '1rem 2rem',
            fontFamily: 'monospace',
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
              background: '#2ff801',
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

  // Delivery form fields
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [phone, setPhone] = useState('')

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

  useEffect(() => {
    loadCart()
    window.scrollTo({ top: 0 })
  }, [loadCart])

  // Derived totals (mirrors backend logic)
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax

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

  // Place order handler
  async function handlePlaceOrder() {
    setCheckoutError(null)

    if (!fullName.trim() || !address.trim() || !city.trim() || !zip.trim()) {
      setCheckoutError('Please fill in all required delivery address fields.')
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

    const deliveryAddress = [address.trim(), city.trim(), zip.trim(), phone.trim()]
      .filter(Boolean)
      .join(', ')

    const payload: CheckoutPayload = {
      delivery_address: deliveryAddress,
      card_last4: rawCard.slice(-4),
      card_holder_name: cardHolder.trim(),
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
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', color: '#e5e2e1' }}>
      <SideNav />

      <main style={{ paddingLeft: '9rem', paddingRight: '4rem', paddingTop: '3rem', paddingBottom: '5rem' }}>

        {/* Checkout progress bar — 75% filled (payment step) */}
        <div style={{ width: '100%', height: '2px', background: '#201f1f', marginBottom: '3rem', overflow: 'hidden' }}>
          <div style={{ width: '75%', height: '100%', background: 'linear-gradient(to right, #2ae500, #d7ffc5)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '3rem', maxWidth: '1400px', margin: '0 auto' }}>

          {/* ── LEFT: Order Summary ──────────────────────────────────────────── */}
          <section>
            <h2 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#c4c7c7', marginBottom: '2rem' }}>
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
                  style={{ marginTop: '1rem', color: '#2ff801', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em' }}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cartItems.map(item => (
                  <div key={item.id} style={{ background: '#201f1f', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ width: '96px', height: '96px', background: '#1c1b1b', flexShrink: 0, overflow: 'hidden' }}>
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
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#c4c7c7', marginBottom: '1rem' }}>
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
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #353534' }}>
              {[
                { label: 'Subtotal', value: fmt(subtotal) },
                { label: 'Shipping', value: shipping === 0 ? 'FREE' : fmt(shipping) },
                { label: 'Tax', value: fmt(tax) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', color: '#c4c7c7' }}>
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#2ff801', letterSpacing: '-0.02em' }}>
                  {fmt(total)}
                </span>
              </div>
            </div>
          </section>

          {/* ── RIGHT: Delivery + Payment form ──────────────────────────────── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

            {/* Section 01: Delivery Address */}
            <div>
              <h2 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#c4c7c7', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#c6c6c7', flexShrink: 0 }}>
                  01
                </span>
                Delivery Address
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL_STYLE}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="JOHN DOE"
                    style={INPUT_STYLE}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL_STYLE}>Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="123 MAIN STREET, APT 4B"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="ISTANBUL"
                    style={INPUT_STYLE}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={LABEL_STYLE}>ZIP</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      placeholder="34000"
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+90 555 0192"
                      style={INPUT_STYLE}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 02: Card Information */}
            <div>
              <h2 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#c4c7c7', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#c6c6c7', flexShrink: 0 }}>
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
                    style={{ position: 'absolute', right: '1rem', bottom: '1rem', color: '#c4c7c7', fontSize: '20px' }}
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
                  background: processing || cartItems.length === 0 ? 'rgba(47,248,1,0.4)' : '#2ff801',
                  color: '#022100',
                  border: 'none',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 900,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  cursor: processing || cartItems.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 0 20px rgba(47,248,1,0.2)',
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
              <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8e9192', marginTop: '1rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                By placing your order, you agree to our Terms of Acquisition.
              </p>
            </div>

          </section>
        </div>
      </main>
    </div>
  )
}
