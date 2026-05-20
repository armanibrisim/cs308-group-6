'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../context/AuthContext'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

type ReqStatus = 'pending' | 'approved' | 'rejected'
type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

interface ReturnRequest {
  id: string
  order_id: string
  customer_id: string
  customer_email?: string
  customer_name?: string
  product_id: string
  product_name: string
  quantity: number
  total_price: number
  reason: string
  status: ReqStatus
  created_at: string
}

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

const STATUS_CFG: Record<ReqStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  approved: { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)'  },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'  },
}

export default function RefundsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const token = user?.token ?? ''

  const [requests, setRequests] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('PENDING')
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchRequests = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/return-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load refund requests.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActing(id)
    try {
      const res = await fetch(`${API}/return-requests/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)
      )
      showToast(action === 'approve' ? 'Refund approved. Stock updated.' : 'Request rejected.', true)
    } catch {
      showToast(`Failed to ${action} request.`, false)
    } finally {
      setActing(null)
    }
  }

  const filtered = requests.filter(r => {
    const matchFilter = filter === 'ALL' || r.status.toUpperCase() === filter
    const matchSearch = (r.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.customer_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      r.order_id.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <button
            onClick={() => router.push('/sales-dashboard')}
            style={{ background: 'none', border: '1px solid rgba(var(--c-text-rgb), 0.12)', borderRadius: '50%', width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(var(--c-text-rgb), 0.5)', flexShrink: 0, transition: 'border-color 0.2s, color 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f59e0b'; (e.currentTarget as HTMLButtonElement).style.color = '#f59e0b' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.5)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
          </button>
          <div>
            <p style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: '0.2rem' }}>Sales Manager</p>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--c-text)' }}>
              Refund Requests
              {pendingCount > 0 && (
                <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', padding: '2px 10px', borderRadius: '9999px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', verticalAlign: 'middle' }}>
                  {pendingCount} pending
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Search + Filter + Stats */}
        <div className="glass-panel rounded-3xl border border-white/10" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'rgba(var(--c-text-rgb), 0.35)', pointerEvents: 'none' }}>search</span>
            <input
              type="text"
              placeholder="Search by product, customer or order…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.65rem', paddingBottom: '0.65rem',
                background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.10)',
                borderRadius: '0.65rem', color: 'var(--c-text)', fontSize: '0.8rem', fontFamily: 'Inter, sans-serif', outline: 'none',
              }}
            />
          </div>

          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: '0.5rem', fontSize: '0.6rem',
                  fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.15em',
                  textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === f ? '#f59e0b' : 'rgba(var(--c-text-rgb), 0.05)',
                  color: filter === f ? '#000' : 'rgba(var(--c-text-rgb), 0.5)',
                  border: `1px solid ${filter === f ? '#f59e0b' : 'rgba(var(--c-text-rgb), 0.10)'}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
            {(['pending', 'approved', 'rejected'] as ReqStatus[]).map(s => {
              const count = requests.filter(r => r.status === s).length
              const cfg = STATUS_CFG[s]
              return (
                <div key={s} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.25rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: cfg.color }}>{count}</p>
                  <p style={{ fontSize: '0.55rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>{cfg.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-3xl border border-white/10" style={{ overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1.4fr', gap: '1rem', padding: '1rem 2rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)', background: 'rgba(var(--c-text-rgb), 0.02)' }}>
            {['Customer', 'Product', 'Qty', 'Refund', 'Status', 'Actions'].map(col => (
              <span key={col} style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>{col}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.7rem' }}>
              LOADING REQUESTS...
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.7rem' }}>
              NO REQUESTS FOUND
            </div>
          ) : (
            filtered.map((req, idx) => {
              const cfg = STATUS_CFG[req.status]
              const isActing = acting === req.id
              const isPending = req.status === 'pending'
              return (
                <div
                  key={req.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1.4fr', gap: '1rem',
                    padding: '1.1rem 2rem', alignItems: 'center',
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(var(--c-text-rgb), 0.05)' : 'none',
                    opacity: req.status === 'rejected' ? 0.6 : 1,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--c-text-rgb), 0.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  {/* Customer */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.customer_name || req.customer_email || req.customer_id}
                    </p>
                    <p style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.35)', marginTop: '2px' }}>
                      ORDER #{req.order_id.slice(-8).toUpperCase()} · {fmtDate(req.created_at)}
                    </p>
                    {req.reason && (
                      <p style={{ fontSize: '0.62rem', fontFamily: 'Inter, sans-serif', color: 'rgba(var(--c-text-rgb), 0.45)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                        "{req.reason}"
                      </p>
                    )}
                  </div>

                  {/* Product */}
                  <p style={{ fontSize: '0.78rem', fontFamily: 'Inter, sans-serif', color: 'rgba(var(--c-text-rgb), 0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.product_name}
                  </p>

                  {/* Qty */}
                  <p style={{ fontSize: '0.825rem', fontFamily: 'Space Grotesk, sans-serif', color: 'rgba(var(--c-text-rgb), 0.65)', fontWeight: 600 }}>
                    {String(req.quantity).padStart(2, '0')}
                  </p>

                  {/* Refund amount */}
                  <p style={{ fontSize: '0.825rem', fontFamily: 'Space Grotesk, sans-serif', color: '#f59e0b', fontWeight: 700 }}>
                    {fmt(req.total_price)}
                  </p>

                  {/* Status badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.65rem', borderRadius: '9999px',
                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    fontSize: '0.55rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase', width: 'fit-content',
                  }}>
                    {cfg.label}
                  </span>

                  {/* Actions */}
                  {isPending ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={isActing}
                        style={{
                          flex: 1, padding: '0.4rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.6rem',
                          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.08em',
                          textTransform: 'uppercase', cursor: isActing ? 'not-allowed' : 'pointer',
                          background: 'transparent', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444',
                          opacity: isActing ? 0.5 : 1, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'approve')}
                        disabled={isActing}
                        style={{
                          flex: 1, padding: '0.4rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.6rem',
                          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.08em',
                          textTransform: 'uppercase', cursor: isActing ? 'not-allowed' : 'pointer',
                          background: isActing ? 'rgba(34,197,94,0.4)' : '#22c55e', border: 'none', color: '#000',
                          opacity: isActing ? 0.6 : 1, transition: 'filter 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActing) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = '' }}
                      >
                        {isActing ? '...' : 'Approve'}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'rgba(var(--c-text-rgb), 0.2)', fontFamily: 'monospace' }}>—</span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Toast */}
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

      </div>
    </main>
  )
}
