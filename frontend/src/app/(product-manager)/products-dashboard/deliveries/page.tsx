'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../context/AuthContext'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

type PMOrderStatus = 'processing' | 'in-transit' | 'delivered' | 'cancelled'
type PMOrderStatusFilter = PMOrderStatus | 'all' | 'refunded'

interface PMOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface PMOrder {
  id: string
  customer_id: string
  customer_email: string
  customer_name: string
  delivery_address: string
  items: PMOrderItem[]
  subtotal: number
  tax: number
  shipping: number
  total_amount: number
  status: PMOrderStatus
  invoice_id?: string
  created_at: string
  updated_at: string
  refunded_items?: Array<{ product_id: string; refund_amount: number; refunded_at: string }> | null
}

const PM_STATUS_BADGE: Record<PMOrderStatus, string> = {
  processing: 'bg-sky-500/10 text-sky-300 border border-sky-500/30',
  'in-transit': 'bg-violet-500/10 text-violet-300 border border-violet-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  cancelled: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DeliveriesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const token = user?.token ?? ''

  const [orders, setOrders] = useState<PMOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<PMOrderStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── auth guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return
    if (!user || (user.role !== 'product_manager' && user.role !== 'admin')) router.replace('/login')
  }, [user, isLoading, router])

  // ── load data ─────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/orders/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOrders(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!isLoading && (user?.role === 'product_manager' || user?.role === 'admin')) loadOrders()
  }, [isLoading, user, loadOrders])

  // ── status update ─────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (orderId: string, newStatus: PMOrderStatus) => {
    if (!token) return
    setUpdatingId(orderId)
    setUpdateError(null)
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated: PMOrder = await res.json()
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o))
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setUpdatingId(null)
    }
  }, [token])

  // ── filtered list ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter(o => {
      const matchQ = !q ||
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q)
      const hasRefunds = (o.refunded_items?.length ?? 0) > 0
      const matchS =
        statusFilter === 'all' ? true :
        statusFilter === 'refunded' ? hasRefunds :
        o.status === statusFilter
      return matchQ && matchS
    })
  }, [orders, search, statusFilter])

  // ── KPI counts ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    count: orders.length,
    processing: orders.filter(o => o.status === 'processing').length,
    inTransit: orders.filter(o => o.status === 'in-transit').length,
    revenue: orders.reduce((s, o) => s + o.total_amount, 0),
  }), [orders])

  // ── render guards ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return <main className="min-h-screen px-8 py-10 text-white/60">Loading…</main>
  }
  if (!user || (user.role !== 'product_manager' && user.role !== 'admin')) return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Product Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Deliveries</h1>
              <p className="mt-2 text-sm text-white/60">
                View and manage all customer orders. Update delivery status and track shipments.
              </p>
            </div>
            <Link
              href="/products-dashboard"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-primary/40 hover:text-primary"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </section>

        {/* ── KPI cards ── */}
        {!loading && !error && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Orders', value: String(kpis.count), color: 'text-white' },
              { label: 'Processing', value: String(kpis.processing), color: 'text-sky-300' },
              { label: 'In Transit', value: String(kpis.inTransit), color: 'text-violet-300' },
              { label: 'Revenue', value: `$${fmtMoney(kpis.revenue)}`, color: 'text-emerald-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-panel rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
                <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </section>
        )}

        {/* ── Filters ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, customer name or email…"
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PMOrderStatusFilter)}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-primary/40"
            >
              <option value="all">All statuses</option>
              <option value="processing">Processing</option>
              <option value="in-transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Has Refunds</option>
            </select>
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {updateError && (
            <p className="mt-3 text-xs text-rose-400">
              ⚠ {updateError}{' '}
              <button onClick={() => setUpdateError(null)} className="underline hover:text-white">Dismiss</button>
            </p>
          )}
        </section>

        {/* ── Table ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-5">
          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-300">
              {error}{' '}
              <button onClick={loadOrders} className="underline hover:text-white">Retry</button>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-white/40 text-sm">Loading orders…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 py-12 text-center text-white/50">
              {orders.length === 0 ? 'No orders found.' : 'No orders match your filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Order ID</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Items</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Placed</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => {
                    const expanded = expandedId === order.id
                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className="border-b border-white/5 cursor-pointer transition hover:bg-white/[0.02]"
                          onClick={() => setExpandedId(expanded ? null : order.id)}
                        >
                          <td className="px-3 py-3 font-medium text-white">{order.id}</td>
                          <td className="px-3 py-3">
                            <p className="text-white/90">{order.customer_name}</p>
                            <p className="text-xs text-white/45">{order.customer_email}</p>
                          </td>
                          <td className="px-3 py-3 text-white/70">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-3 py-3 font-semibold text-white">${fmtMoney(order.total_amount)}</td>
                          <td className="px-3 py-3 text-white/65">{order.created_at.slice(0, 10)}</td>
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const hasRefunds = (order.refunded_items?.length ?? 0) > 0
                              const isLocked = order.status === 'cancelled' || hasRefunds

                              if (updatingId === order.id) {
                                return <span className="text-xs text-white/40">Saving…</span>
                              }

                              if (isLocked) {
                                return (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${PM_STATUS_BADGE[order.status]}`}>
                                      {order.status === 'cancelled' ? 'Cancelled' : 'Delivered'}
                                    </span>
                                    {hasRefunds && (
                                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                                        Refunded
                                      </span>
                                    )}
                                  </div>
                                )
                              }

                              return (
                                <select
                                  value={order.status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    handleStatusChange(order.id, e.target.value as PMOrderStatus)
                                  }}
                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize outline-none cursor-pointer transition bg-transparent hover:opacity-80 ${PM_STATUS_BADGE[order.status]}`}
                                >
                                  {(['processing', 'in-transit', 'delivered'] as PMOrderStatus[]).map((s) => (
                                    <option key={s} value={s}>
                                      {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              )
                            })()}
                          </td>
                          <td className="px-3 py-3 text-xs text-white/40">
                            {order.invoice_id ?? '—'}
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${order.id}-items`} className="border-b border-white/5 bg-white/[0.015]">
                            <td colSpan={7} className="px-6 py-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                                Line Items
                              </p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-white/40">
                                    <th className="py-1 text-left font-normal">Product</th>
                                    <th className="py-1 text-right font-normal">Qty</th>
                                    <th className="py-1 text-right font-normal">Unit Price</th>
                                    <th className="py-1 text-right font-normal">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, i) => (
                                    <tr key={i} className="border-t border-white/5">
                                      <td className="py-1 text-white/80">{item.product_name}</td>
                                      <td className="py-1 text-right text-white/60">{item.quantity}</td>
                                      <td className="py-1 text-right text-white/60">${fmtMoney(item.unit_price)}</td>
                                      <td className="py-1 text-right text-white/80">${fmtMoney(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="mt-3 flex gap-6 text-xs text-white/40">
                                <span>📍 {order.delivery_address}</span>
                                <span>Updated: {order.updated_at.slice(0, 10)}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
