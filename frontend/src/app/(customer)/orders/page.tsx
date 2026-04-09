'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { SideNav } from '../../../components/layout/SideNav'
import { useAuth } from '../../../context/AuthContext'
import { Order, orderService } from '../../../services/orderService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; step: number }> = {
  processing:  { label: 'Processing',  color: '#f59e0b', step: 1 },
  'in-transit':{ label: 'In Transit',  color: '#60a5fa', step: 2 },
  delivered:   { label: 'Delivered',   color: '#2ff801', step: 3 },
}

// ── Status Stepper ─────────────────────────────────────────────────────────────

function StatusStepper({ status }: { status: Order['status'] }) {
  const steps = ['processing', 'in-transit', 'delivered'] as const
  const currentStep = STATUS_CONFIG[status].step

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: '1.5rem' }}>
      {steps.map((step, i) => {
        const cfg = STATUS_CONFIG[step]
        const done = cfg.step <= currentStep
        const active = step === status
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: done ? cfg.color : '#2a2a2a',
                border: `2px solid ${done ? cfg.color : '#444'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? `0 0 12px ${cfg.color}80` : 'none',
                transition: 'all 0.3s',
              }}>
                {done && (
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: step === 'processing' ? '#000' : '#000', fontVariationSettings: '"wght" 700' }}>
                    {step === 'delivered' ? 'check' : step === 'in-transit' ? 'local_shipping' : 'inventory_2'}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: done ? cfg.color : '#555', whiteSpace: 'nowrap' }}>
                {cfg.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 4px', marginBottom: '1.2rem',
                background: STATUS_CONFIG[steps[i + 1]].step <= currentStep ? STATUS_CONFIG[steps[i + 1]].color : '#2a2a2a',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[order.status]

  return (
    <div style={{
      background: '#1c1b1b',
      border: '1px solid #353534',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent */}
      <div style={{ height: '2px', background: cfg.color, boxShadow: `0 0 8px ${cfg.color}80` }} />

      <div style={{ padding: '2rem' }}>
        {/* Header row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8e9192', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Order
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}>
              #{order.id.slice(-8).toUpperCase()}
            </div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8e9192', marginTop: '4px' }}>
              {fmtDate(order.created_at)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8e9192', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Total
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              {fmt(order.total_amount)}
            </div>
          </div>
        </div>

        {/* Status stepper */}
        <StatusStepper status={order.status} />

        {/* Items preview */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} style={{
              fontSize: '10px', fontFamily: 'monospace', padding: '4px 10px',
              background: '#2a2a2a', color: '#c4c7c7',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {item.product_name} ×{item.quantity}
            </div>
          ))}
          {order.items.length > 3 && (
            <div style={{ fontSize: '10px', fontFamily: 'monospace', padding: '4px 10px', background: '#2a2a2a', color: '#8e9192' }}>
              +{order.items.length - 3} more
            </div>
          )}
        </div>

        {/* Toggle detail */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginTop: '1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase',
            letterSpacing: '0.2em', color: '#8e9192', display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8e9192')}
        >
          {expanded ? 'Hide Details ▲' : 'View Details ▼'}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #353534' }}>
            <table style={{ width: '100%', fontFamily: 'monospace', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #353534' }}>
                  {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0', textAlign: h === 'Product' ? 'left' : 'right', fontSize: '9px', textTransform: 'uppercase', color: '#8e9192', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(53,53,52,0.5)' }}>
                    <td style={{ padding: '0.75rem 0', fontSize: '11px' }}>{item.product_name}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '11px', color: '#c4c7c7' }}>{item.quantity}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '11px', color: '#c4c7c7' }}>{fmt(item.unit_price)}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '11px' }}>{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8e9192', lineHeight: 2 }}>
                <span style={{ textTransform: 'uppercase' }}>Delivery Address</span><br />
                <span style={{ color: '#c4c7c7' }}>{order.delivery_address}</span>
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', textAlign: 'right', lineHeight: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3rem' }}>
                  <span style={{ color: '#8e9192' }}>Subtotal</span>
                  <span>{fmt(order.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3rem' }}>
                  <span style={{ color: '#8e9192' }}>Tax</span>
                  <span>{fmt(order.tax)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3rem' }}>
                  <span style={{ color: '#8e9192' }}>Shipping</span>
                  <span>{order.shipping === 0 ? 'FREE' : fmt(order.shipping)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3rem', borderTop: '1px solid #353534', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: '#2ff801' }}>{fmt(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    if (!user?.token) return
    setLoading(true)
    setError(null)
    try {
      const data = await orderService.getMyOrders(user.token)
      setOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!authLoading && user) loadOrders()
  }, [authLoading, user, loadOrders])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', color: '#e5e2e1' }}>
      <SideNav />

      <main style={{ paddingTop: '0', paddingBottom: '5rem', paddingLeft: '9rem', paddingRight: '4rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '3rem', paddingTop: '3rem' }}>
          <h1 className="font-wide" style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, textTransform: 'uppercase' }}>
            My Orders
          </h1>
          <button
            onClick={loadOrders}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#8e9192', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8e9192')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: '2rem', padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px', color: '#ef4444', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ padding: '8rem 0', textAlign: 'center', opacity: 0.4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>sync</span>
            <p className="font-wide" style={{ marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: '0.75rem' }}>
              Loading Orders…
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '8rem 0', textAlign: 'center', opacity: 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '5rem', marginBottom: '2rem' }}>package_2</span>
            <p className="font-wide" style={{ textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: '0.85rem' }}>
              No Orders Yet
            </p>
            <button
              onClick={() => router.push('/browse')}
              style={{ marginTop: '2rem', color: '#2ff801', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em' }}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>
            {orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
