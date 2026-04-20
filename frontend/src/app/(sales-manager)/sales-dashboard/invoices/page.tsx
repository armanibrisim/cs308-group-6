'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../../context/AuthContext'
import {
  AnalyticsResponse,
  Invoice,
  salesService,
} from '../../../../services/salesService'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return iso.slice(0, 10)
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SalesManagerInvoicesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // data
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // date filter
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // search
  const [search, setSearch] = useState('')

  // expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // feedback banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── auth guard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== 'sales_manager') router.replace('/login')
  }, [isLoading, router, user])

  // ── load data ──────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user?.token) return
    setLoading(true)
    setFetchError(null)
    try {
      const sd = startDate || undefined
      const ed = endDate || undefined
      const [invData, analyticsData] = await Promise.all([
        salesService.getInvoices(user.token, sd, ed),
        salesService.getAnalytics(user.token, sd, ed),
      ])
      setInvoices(invData)
      setAnalytics(analyticsData)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [user?.token, startDate, endDate])

  useEffect(() => {
    if (!isLoading && user?.role === 'sales_manager') loadData()
  }, [isLoading, user, loadData])

  // ── filtered list ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(
      (inv) =>
        inv.id.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        inv.customer_email.toLowerCase().includes(q),
    )
  }, [invoices, search])

  // ── CSV export ─────────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['Invoice ID', 'Customer', 'Email', 'Subtotal', 'Tax', 'Shipping', 'Total', 'Date'],
      ...filtered.map((inv) => [
        inv.id,
        inv.customer_name,
        inv.customer_email,
        inv.subtotal.toFixed(2),
        inv.tax.toFixed(2),
        inv.shipping.toFixed(2),
        inv.total_amount.toFixed(2),
        fmtDate(inv.created_at),
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setBanner({ type: 'success', message: `Exported ${filtered.length} invoice(s) to CSV.` })
  }

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
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Invoices</h1>
              <p className="mt-2 text-sm text-white/60">
                View and export invoices generated at checkout. Filter by date range for period reporting.
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

        {/* ── Banner ── */}
        {banner && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{banner.message}</span>
              <button type="button" onClick={() => setBanner(null)} className="text-white/60 hover:text-white">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Analytics cards ── */}
        {analytics && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Revenue', value: `₺${fmt(analytics.total_revenue)}`, color: 'text-emerald-300' },
              { label: 'Cost', value: `₺${fmt(analytics.total_cost)}`, color: 'text-white/80' },
              { label: 'Profit', value: `₺${fmt(analytics.total_profit)}`, color: 'text-primary' },
              { label: 'Invoices', value: String(analytics.invoice_count), color: 'text-sky-300' },
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
              placeholder="Search by ID, customer, or email…"
              className="min-w-[220px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary/40"
            />
            <label className="flex items-center gap-2 text-sm text-white/60">
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/60">
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
              />
            </label>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Apply Filter'}
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
        </section>

        {/* ── Table ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-5">
          {fetchError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-300">
              {fetchError}{' '}
              <button onClick={loadData} className="underline hover:text-white">
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-white/40 text-sm">Loading invoices…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 py-12 text-center text-white/50">
              {invoices.length === 0 ? 'No invoices found for this period.' : 'No invoices match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Invoice</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Subtotal</th>
                    <th className="px-3 py-3">Tax</th>
                    <th className="px-3 py-3">Shipping</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const expanded = expandedId === inv.id
                    return (
                      <React.Fragment key={inv.id}>
                        <tr
                          className="border-b border-white/5 cursor-pointer hover:bg-white/[0.02] transition"
                          onClick={() => setExpandedId(expanded ? null : inv.id)}
                        >
                          <td className="px-3 py-3 font-medium text-white">{inv.id}</td>
                          <td className="px-3 py-3">
                            <p className="text-white/90">{inv.customer_name}</p>
                            <p className="text-xs text-white/45">{inv.customer_email}</p>
                          </td>
                          <td className="px-3 py-3 text-white/80">₺{fmt(inv.subtotal)}</td>
                          <td className="px-3 py-3 text-white/65">₺{fmt(inv.tax)}</td>
                          <td className="px-3 py-3 text-white/65">₺{fmt(inv.shipping)}</td>
                          <td className="px-3 py-3 font-semibold text-white">₺{fmt(inv.total_amount)}</td>
                          <td className="px-3 py-3 text-white/65">{fmtDate(inv.created_at)}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/60">
                              {inv.items.length} item{inv.items.length !== 1 ? 's' : ''} {expanded ? '▲' : '▼'}
                            </span>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${inv.id}-items`} className="border-b border-white/5 bg-white/[0.015]">
                            <td colSpan={8} className="px-6 py-4">
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
                                  {inv.items.map((item, i) => (
                                    <tr key={i} className="border-t border-white/5">
                                      <td className="py-1 text-white/80">{item.product_name}</td>
                                      <td className="py-1 text-right text-white/60">{item.quantity}</td>
                                      <td className="py-1 text-right text-white/60">₺{fmt(item.unit_price)}</td>
                                      <td className="py-1 text-right text-white/80">₺{fmt(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <p className="mt-3 text-xs text-white/30">
                                📍 {inv.delivery_address}
                              </p>
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
