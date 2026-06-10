'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { SideNav } from '../../../components/layout/SideNav'
import { useAuth } from '../../../context/AuthContext'
import { Order, OrderItem, ReturnRequest, orderService } from '../../../services/orderService'

// ── Constants & helpers ───────────────────────────────────────────────────────

const RETURN_WINDOW_DAYS = 30
const MUTED = 'rgba(var(--c-text-rgb), 0.45)'

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}
/** Return reference time for 30-day policy: teslim anı (delivered_at) veya son güncelleme */
function returnWindowStart(order: Order): string {
  return (order.delivered_at && order.delivered_at.trim()) || order.updated_at || order.created_at
}
function isOrderReturnable(order: Order) {
  if (order.status !== 'delivered') return false
  return Date.now() - new Date(returnWindowStart(order)).getTime() <= RETURN_WINDOW_DAYS * 864e5
}
function daysLeft(order: Order) {
  const ms = RETURN_WINDOW_DAYS * 864e5 - (Date.now() - new Date(returnWindowStart(order)).getTime())
  return Math.max(0, Math.ceil(ms / 864e5))
}

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; step: number }> = {
  processing:   { label: 'Processing',  color: '#d97706', step: 1 },
  'in-transit': { label: 'In Transit',  color: '#3b82f6', step: 2 },
  delivered:    { label: 'Delivered',   color: '#16a34a', step: 3 },
  cancelled:    { label: 'Cancelled',   color: '#6b7280', step: 0 },
}

// ── Return status badge ───────────────────────────────────────────────────────

function ReturnBadge({ status }: { status: string }) {
  const cfg =
    status === 'approved'  ? { label: 'Return approved', color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)'   } :
    status === 'rejected'  ? { label: 'Rejected',        color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)'   } :
                             { label: 'Under review',    color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)'  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '9999px',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: '9px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
        {status === 'approved' ? 'check_circle' : status === 'rejected' ? 'cancel' : 'hourglass_empty'}
      </span>
      {cfg.label}
    </span>
  )
}

// ── Return modal ──────────────────────────────────────────────────────────────

interface ReturnModalProps {
  item: OrderItem
  orderId: string
  onClose: () => void
  onConfirm: (productId: string, reason: string) => Promise<void>
  isSubmitting: boolean
}

function ReturnModal({ item, orderId, onClose, onConfirm, isSubmitting }: ReturnModalProps) {
  const [reason, setReason] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="grounded-box" style={{
        borderRadius: '1.5rem', padding: '2rem', width: '100%', maxWidth: '440px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        border: '1px solid rgba(245,158,11,0.20)',
      }}>
        {/* Heading */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.3em', color: '#f59e0b', marginBottom: '0.3rem' }}>RETURN & REFUND</p>
            <h2 style={{ fontSize: '1.2rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
              {item.product_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: '2px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>close</span>
          </button>
        </div>

        {/* Order ref */}
        <p style={{ fontSize: '10px', fontFamily: 'monospace', color: MUTED, marginBottom: '1.25rem', letterSpacing: '0.08em' }}>
          ORDER #{orderId.slice(-8).toUpperCase()} · QTY {item.quantity}
        </p>

        {/* Refund amount highlight */}
        <div style={{
          padding: '1rem 1.25rem', borderRadius: '0.75rem',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
          marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#f59e0b', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>REFUND AMOUNT</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'Space Grotesk, sans-serif', color: '#f59e0b', letterSpacing: '-0.02em' }}>
            {fmt(item.subtotal)}
          </p>
          <p style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.4)', marginTop: '0.4rem', lineHeight: 1.6 }}>
            Reflects the amount you paid, including any discounts applied at checkout.
          </p>
        </div>

        {/* Reason */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.15em', color: MUTED, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Briefly describe why you are returning this item…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '0.75rem',
              background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.12)',
              borderRadius: '0.625rem', color: 'var(--c-text)', fontSize: '0.8rem',
              fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.625rem',
              background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.12)',
              color: MUTED, fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(item.product_id, reason)}
            disabled={isSubmitting}
            style={{
              flex: 2, padding: '0.75rem', borderRadius: '0.625rem',
              background: isSubmitting ? 'rgba(245,158,11,0.4)' : '#f59e0b',
              border: 'none', color: '#000',
              fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'filter 0.15s',
            }}
            onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = '' }}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                Submitting…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>assignment_return</span>
                Submit request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status stepper ────────────────────────────────────────────────────────────

function StatusStepper({ status }: { status: Order['status'] }) {
  if (status === 'cancelled') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        marginTop: '1.5rem', padding: '6px 14px', borderRadius: '9999px',
        background: 'rgba(107,114,128,0.12)', border: '1px solid rgba(107,114,128,0.30)',
        color: '#6b7280', fontSize: '11px', fontFamily: 'Space Grotesk, sans-serif',
        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>cancel</span>
        Order Cancelled
      </div>
    )
  }

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
                background: done ? cfg.color : 'rgba(var(--c-text-rgb), 0.08)',
                border: `2px solid ${done ? cfg.color : 'rgba(var(--c-text-rgb), 0.20)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? `0 0 12px ${cfg.color}80` : 'none', transition: 'all 0.3s',
              }}>
                {done && (
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#000', fontVariationSettings: '"wght" 700' }}>
                    {step === 'delivered' ? 'check' : step === 'in-transit' ? 'local_shipping' : 'inventory_2'}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: done ? cfg.color : MUTED, whiteSpace: 'nowrap' }}>
                {cfg.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 4px', marginBottom: '1.2rem',
                background: STATUS_CONFIG[steps[i + 1]].step <= currentStep ? STATUS_CONFIG[steps[i + 1]].color : 'rgba(var(--c-text-rgb), 0.10)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Order card ────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order
  token: string
  returnRequests: ReturnRequest[]
  onReturnSuccess: (req: ReturnRequest) => void
  onCancelSuccess: (orderId: string) => void
}

function OrderCard({ order, token, returnRequests, onReturnSuccess, onCancelSuccess }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [modalItem, setModalItem] = useState<OrderItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const cfg = STATUS_CONFIG[order.status]
  const returnable = isOrderReturnable(order)
  const days = daysLeft(order)

  // Build a lookup: productId → ReturnRequest for this order
  const returnMap = Object.fromEntries(
    returnRequests
      .filter(r => r.order_id === order.id)
      .map(r => [r.product_id, r])
  )

  const openReturnSlots = returnable
    ? order.items.filter(it => {
        const r = returnMap[it.product_id]
        return !r || (r.status !== 'pending' && r.status !== 'approved')
      }).length
    : 0

  const allItemsApproved =
    order.items.length > 0 &&
    order.items.every(it => returnMap[it.product_id]?.status === 'approved')

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const cancellable = order.status === 'processing'

  const handleCancelOrder = async () => {
    setCancelling(true)
    try {
      await orderService.cancelOrder(order.id, token)
      onCancelSuccess(order.id)
      showToast('Order cancelled. Stock has been restored.', true)
    } catch {
      showToast('Could not cancel order. Please try again.', false)
    } finally {
      setCancelling(false)
      setCancelConfirm(false)
    }
  }

  const handleConfirmReturn = async (productId: string, reason: string) => {
    setSubmitting(true)
    try {
      const req = await orderService.requestReturn(order.id, productId, token, reason)
      onReturnSuccess(req)
      setModalItem(null)
      showToast('Return request submitted. Our sales team will review it shortly.', true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setModalItem(null)
      if (msg.includes('409')) showToast('A return request for this item already exists.', false)
      else if (msg.includes('400')) showToast('This item is not eligible for return or the return window has expired.', false)
      else showToast('Could not submit return request. Please check your connection.', false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* ── Modal ── */}
      {modalItem && (
        <ReturnModal
          item={modalItem}
          orderId={order.id}
          onClose={() => setModalItem(null)}
          onConfirm={handleConfirmReturn}
          isSubmitting={submitting}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          padding: '0.875rem 1.5rem', borderRadius: '0.75rem',
          background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
          color: toast.ok ? '#22c55e' : '#ef4444',
          fontSize: '0.78rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Card ── */}
      <div className="grounded-box" style={{ borderRadius: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: '2px', background: cfg.color, boxShadow: `0 0 8px ${cfg.color}80` }} />

        <div style={{ padding: '2rem' }}>
          {/* Header row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Order</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--c-text)' }}>#{order.id.slice(-8).toUpperCase()}</div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: MUTED, marginTop: '4px' }}>{fmtDate(order.created_at)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--c-text)', letterSpacing: '-0.02em' }}>{fmt(order.total_amount)}</div>
            </div>
          </div>

          <StatusStepper status={order.status} />

          {/* Cancel order */}
          {cancellable && (
            <div style={{ marginTop: '1.25rem' }}>
              {!cancelConfirm ? (
                <button
                  onClick={() => setCancelConfirm(true)}
                  style={{
                    background: 'none', border: '1px solid rgba(239,68,68,0.30)',
                    borderRadius: '0.4rem', padding: '5px 14px',
                    color: 'rgba(239,68,68,0.70)', cursor: 'pointer',
                    fontSize: '9px', fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.30)'; e.currentTarget.style.color = 'rgba(239,68,68,0.70)' }}
                >
                  Cancel Order
                </button>
              ) : (
                <div style={{
                  padding: '0.875rem 1rem', borderRadius: '0.65rem',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                  gap: '0.75rem', justifyContent: 'space-between',
                }}>
                  <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#ef4444', margin: 0, letterSpacing: '0.04em' }}>
                    Are you sure? This will cancel your order and restore stock.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => setCancelConfirm(false)}
                      disabled={cancelling}
                      style={{
                        fontSize: '9px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '6px 14px', borderRadius: '0.4rem',
                        background: 'rgba(var(--c-text-rgb), 0.05)',
                        border: '1px solid rgba(var(--c-text-rgb), 0.12)',
                        color: MUTED, cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={cancelling}
                      style={{
                        fontSize: '9px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '6px 14px', borderRadius: '0.4rem',
                        background: cancelling ? 'rgba(239,68,68,0.4)' : '#ef4444',
                        border: 'none', color: '#fff',
                        cursor: cancelling ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      {cancelling && (
                        <span className="material-symbols-outlined" style={{ fontSize: '11px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                      )}
                      {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {returnable && !expanded && openReturnSlots > 0 && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.65rem',
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.22)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.75rem',
              justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#f59e0b', margin: 0, letterSpacing: '0.04em', lineHeight: 1.55 }}>
                You have <strong>{days} days</strong> left to return items from delivery. Use <strong>Create Return Request</strong> on each product row.
              </p>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                style={{
                  flexShrink: 0,
                  fontSize: '9px',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '8px 14px',
                  borderRadius: '0.4rem',
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.45)',
                  color: '#f59e0b',
                  cursor: 'pointer',
                }}
              >
                View details
              </button>
            </div>
          )}

          {/* Items preview */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {order.items.slice(0, 3).map((item, i) => (
              <div key={i} style={{
                fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
                padding: '4px 10px', borderRadius: '0.375rem',
                background: 'rgba(var(--c-text-rgb), 0.06)', color: 'rgba(var(--c-text-rgb), 0.5)',
                border: '1px solid rgba(var(--c-text-rgb), 0.08)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {item.product_name} ×{item.quantity}
              </div>
            ))}
            {order.items.length > 3 && (
              <div style={{
                fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
                padding: '4px 10px', borderRadius: '0.375rem',
                background: 'rgba(var(--c-text-rgb), 0.04)', color: 'rgba(var(--c-text-rgb), 0.3)',
                border: '1px solid rgba(var(--c-text-rgb), 0.06)',
              }}>
                +{order.items.length - 3} more
              </div>
            )}
          </div>

          {/* Toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              marginTop: '1.5rem', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase',
              letterSpacing: '0.2em', color: MUTED, display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
          >
            {expanded ? 'Hide Details ▲' : 'View Details ▼'}
          </button>

          {/* Expanded */}
          {expanded && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--c-panel-border)' }}>

              {/* Return eligibility banner */}
              {returnable && !allItemsApproved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.65rem 1rem', borderRadius: '0.625rem', marginBottom: '1.25rem',
                  background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.95rem', color: '#f59e0b', flexShrink: 0 }}>assignment_return</span>
                  <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#f59e0b', letterSpacing: '0.05em' }}>
                    Return window from delivery: <strong>{days} days</strong> remaining. Use <strong>Create Return Request</strong> per product in the table below.
                  </p>
                </div>
              )}

              {/* Items table */}
              <table style={{ width: '100%', fontFamily: 'Inter, sans-serif', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--c-panel-border)' }}>
                    {['Product', 'Qty', 'Unit Price', 'Subtotal', ...(returnable ? ['Return Status'] : [])].map(h => (
                      <th key={h} style={{
                        padding: '0.5rem 0', fontSize: '9px', textTransform: 'uppercase',
                        color: MUTED, fontWeight: 500,
                        textAlign: h === 'Product' ? 'left' : 'right',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => {
                    const existingReq = returnMap[item.product_id]
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(var(--c-text-rgb), 0.05)' }}>
                        <td style={{ padding: '0.75rem 0', fontSize: '11px', color: 'var(--c-text)' }}>{item.product_name}</td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '11px', color: 'rgba(var(--c-text-rgb), 0.6)' }}>{item.quantity}</td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '11px', color: 'rgba(var(--c-text-rgb), 0.6)' }}>{fmt(item.unit_price)}</td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '11px', color: 'var(--c-text)' }}>{fmt(item.subtotal)}</td>
                        {returnable && (
                          <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                            {existingReq && existingReq.status !== 'rejected' ? (
                              <ReturnBadge status={existingReq.status} />
                            ) : (
                              <button
                                onClick={() => setModalItem(item)}
                                style={{
                                  fontSize: '9px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
                                  textTransform: 'uppercase', letterSpacing: '0.1em',
                                  padding: '4px 12px', borderRadius: '0.4rem',
                                  background: 'transparent', border: '1px solid rgba(245,158,11,0.35)',
                                  color: '#f59e0b', cursor: 'pointer', transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.08)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                              >
                                Create return request
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Footer: address + totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: MUTED, lineHeight: 2 }}>
                  <span style={{ textTransform: 'uppercase' }}>Delivery Address</span><br />
                  <span style={{ color: 'rgba(var(--c-text-rgb), 0.7)' }}>{order.delivery_address}</span>
                </div>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', textAlign: 'right', lineHeight: 2 }}>
                  {[
                    ['Subtotal', fmt(order.subtotal)],
                    ['Tax', fmt(order.tax)],
                    ['Shipping', order.shipping === 0 ? 'FREE' : fmt(order.shipping)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '3rem' }}>
                      <span style={{ color: MUTED }}>{label}</span>
                      <span style={{ color: 'var(--c-text)' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3rem', borderTop: '1px solid var(--c-panel-border)', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--c-text)' }}>Total</span>
                    <span style={{ color: 'var(--c-neon)' }}>{fmt(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const token = user?.token ?? ''

  const [orders, setOrders] = useState<Order[]>([])
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    if (!user?.token) return
    setLoading(true)
    setError(null)
    try {
      const [ordersData, returnData] = await Promise.allSettled([
        orderService.getMyOrders(user.token),
        orderService.getMyReturnRequests(user.token),
      ])
      setOrders(ordersData.status === 'fulfilled' ? ordersData.value : [])
      setReturnRequests(returnData.status === 'fulfilled' ? returnData.value : [])
      if (ordersData.status === 'rejected') throw ordersData.reason
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [authLoading, user, router])
  useEffect(() => { if (!authLoading && user) loadOrders() }, [authLoading, user, loadOrders])

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)' }}>
      <SideNav />

      <main style={{ paddingTop: 0, paddingBottom: '5rem', paddingLeft: '9rem', paddingRight: '4rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '3rem', paddingTop: '3rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', color: 'var(--c-neon)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '0.4rem' }}>ACCOUNT</p>
            <h1 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--c-text)' }}>
              My Orders
            </h1>
          </div>
          <button
            onClick={loadOrders} disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: MUTED, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.4rem' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '2rem', padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px', color: '#ef4444', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '8rem 0', textAlign: 'center', opacity: 0.4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>sync</span>
            <p className="font-wide" style={{ marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: '0.75rem' }}>Loading Orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '8rem 0', textAlign: 'center', opacity: 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '5rem', marginBottom: '2rem' }}>package_2</span>
            <p className="font-wide" style={{ textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: '0.85rem' }}>No Orders Yet</p>
            <button onClick={() => router.push('/browse')} style={{ marginTop: '2rem', color: 'var(--c-neon)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em' }}>
              Start Shopping
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                token={token}
                returnRequests={returnRequests}
                onReturnSuccess={req => setReturnRequests(prev => [...prev, req])}
                onCancelSuccess={id => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
