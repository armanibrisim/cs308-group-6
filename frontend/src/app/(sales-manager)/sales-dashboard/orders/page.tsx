'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../../context/AuthContext'
import { Order, salesService } from '../../../../services/salesService'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return iso.slice(0, 10)
}

type OrderStatus = Order['status']

const STATUS_BADGE: Record<OrderStatus, string> = {
  processing: 'bg-sky-500/10 text-sky-300 border border-sky-500/30',
  'in-transit': 'bg-violet-500/10 text-violet-300 border border-violet-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
}

const STATUS_OPTIONS: Array<OrderStatus | 'all'> = ['all', 'processing', 'in-transit', 'delivered']

// ── component ─────────────────────────────────────────────────────────────────

export default function SalesManagerOrdersPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // data
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // filter
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  // expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── auth guard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== 'sales_manager') router.replace('/login')
  }, [isLoading, router, user])

  // ── load data ──────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!user?.token) return
    setLoading(true)
    setFetchError(null)
    try {
      // fetch all orders (no server-side status filter for now — we filter client-side)
      const data = await salesService.getOrders(user.token)
      setOrders(data)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    if (!isLoading && user?.role === 'sales_manager') loadOrders()
  }, [isLoading, user, loadOrders])

  // ── filtered list ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      const matchQ =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q)
      const matchS = statusFilter === 'all' || o.status === statusFilter
      return matchQ && matchS
    })
  }, [orders, search, statusFilter])

  // ── KPI counts ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = orders.reduce((s, o) => s + o.total_amount, 0)
    const byStatus = {
      processing: orders.filter((o) => o.status === 'processing').length,
      'in-transit': orders.filter((o) => o.status === 'in-transit').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
    }
    return { total, byStatus, count: orders.length }
  }, [orders])

  // ── render guards ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return <main className="min-h-screen px-8 py-10 text-white/60">Loading…</main>
  }
  if (!user || user.role !== 'sales_manager') return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Sales Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">All Orders</h1>
              <p className="mt-2 text-sm text-white/60">
                Read-only view of all customer orders. Use the Deliveries module to update order statuses.
              </p>
            </div>
            <Link
              href="/sales-dashboard"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-primary/40 hover:text-primary"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </section>

        {/* ── KPI cards ── */}
        {!loading && !fetchError && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Orders', value: String(kpis.count), color: 'text-white' },
              { label: 'Processing', value: String(kpis.byStatus.processing), color: 'text-sky-300' },
              { label: 'In Transit', value: String(kpis.byStatus['in-transit']), color: 'text-violet-300' },
              { label: 'Revenue', value: `₺${fmt(kpis.total)}`, color: 'text-emerald-300' },
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
              placeholder="Search by order ID, customer, or email…"
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-primary/40"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
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
        </section>

        {/* ── Table ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-5">
          {fetchError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-300">
              {fetchError}{' '}
              <button onClick={loadOrders} className="underline hover:text-white">
                Retry
              </button>
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
                      <>
                        <tr
                          key={order.id}
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
                          <td className="px-3 py-3 font-semibold text-white">₺{fmt(order.total_amount)}</td>
                          <td className="px-3 py-3 text-white/65">{fmtDate(order.created_at)}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[order.status]}`}
                            >
                              {order.status}
                            </span>
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
                                      <td className="py-1 text-right text-white/60">₺{fmt(item.unit_price)}</td>
                                      <td className="py-1 text-right text-white/80">₺{fmt(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="mt-3 flex gap-6 text-xs text-white/40">
                                <span>📍 {order.delivery_address}</span>
                                <span>Updated: {fmtDate(order.updated_at)}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
