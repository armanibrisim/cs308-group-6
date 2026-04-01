'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { salesService, Invoice, AnalyticsResponse, DiscountProduct } from '../../../services/salesService'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthAgo() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

// ── SVG bar chart ─────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { date: string; revenue: number; profit: number }[] }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-48 text-white/30 text-sm">
      No data for selected period
    </div>
  )

  const W = 700
  const H = 220
  const PAD = { top: 20, right: 20, bottom: 50, left: 70 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.profit]), 1)
  const barGroup = chartW / data.length
  const barW = Math.max(barGroup * 0.3, 4)

  const yTicks = 4
  const yStep = maxVal / yTicks

  const scaleY = (v: number) => chartH - (v / maxVal) * chartH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#39ff14" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#39ff14" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ff8ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2ff8ff" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {/* Y-axis grid & labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const y = scaleY(i * yStep)
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={-8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={11}>
                {(i * yStep).toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = i * barGroup + barGroup / 2
          const ry = scaleY(d.revenue)
          const py = scaleY(Math.max(d.profit, 0))

          return (
            <g key={d.date}>
              {/* Revenue bar */}
              <rect
                x={cx - barW - 2}
                y={ry}
                width={barW}
                height={chartH - ry}
                fill="url(#revGrad)"
                rx={2}
              />
              {/* Profit bar */}
              <rect
                x={cx + 2}
                y={py}
                width={barW}
                height={chartH - py}
                fill={d.profit >= 0 ? 'url(#profGrad)' : 'rgba(255,80,80,0.6)'}
                rx={2}
              />
              {/* X-label */}
              <text
                x={cx}
                y={chartH + 18}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
              >
                {d.date.slice(5)}
              </text>
            </g>
          )
        })}

        {/* X axis line */}
        <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="rgba(255,255,255,0.12)" />
      </g>

      {/* Legend */}
      <g transform={`translate(${PAD.left + chartW / 2 - 80}, ${H - 6})`}>
        <rect width={10} height={10} fill="#39ff14" rx={2} />
        <text x={14} y={9} fill="rgba(255,255,255,0.5)" fontSize={11}>Revenue</text>
        <rect x={74} width={10} height={10} fill="#2ff8ff" rx={2} />
        <text x={88} y={9} fill="rgba(255,255,255,0.5)" fontSize={11}>Profit</text>
      </g>
    </svg>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl cursor-pointer"
      style={{
        background: type === 'ok' ? 'rgba(57,255,20,0.12)' : 'rgba(255,60,60,0.12)',
        border: `1px solid ${type === 'ok' ? 'rgba(57,255,20,0.35)' : 'rgba(255,60,60,0.35)'}`,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 8px 32px ${type === 'ok' ? 'rgba(57,255,20,0.15)' : 'rgba(255,60,60,0.15)'}`,
      }}
    >
      <span style={{ fontSize: 20 }}>{type === 'ok' ? '✓' : '✕'}</span>
      <span className="text-sm font-medium" style={{ color: type === 'ok' ? '#39ff14' : '#ff5050' }}>
        {msg}
      </span>
    </div>
  )
}

// ── Printable invoice ─────────────────────────────────────────────────────────

function PrintableInvoice({ inv }: { inv: Invoice }) {
  return (
    <div id={`invoice-print-${inv.id}`} style={{ display: 'none' }}>
      <div style={{ fontFamily: 'Inter,sans-serif', padding: 40, maxWidth: 680, color: '#111' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>LUMEN Invoice</h1>
        <p style={{ color: '#666', fontSize: 13 }}>Invoice #{inv.id.slice(0, 8).toUpperCase()}</p>
        <p style={{ color: '#666', fontSize: 13 }}>{new Date(inv.created_at).toLocaleDateString()}</p>
        <hr style={{ margin: '20px 0' }} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '6px 0' }}>Product</th>
              <th style={{ padding: '6px 0' }}>Qty</th>
              <th style={{ padding: '6px 0' }}>Unit</th>
              <th style={{ padding: '6px 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '5px 0' }}>{it.product_name}</td>
                <td>{it.quantity}</td>
                <td>₺{it.unit_price.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>₺{it.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: 'right', marginTop: 20, fontSize: 13 }}>
          <p>Subtotal: ₺{inv.subtotal.toFixed(2)}</p>
          <p>Tax: ₺{inv.tax.toFixed(2)}</p>
          <p>Shipping: ₺{inv.shipping.toFixed(2)}</p>
          <p style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>Total: ₺{inv.total_amount.toFixed(2)}</p>
        </div>
        <hr style={{ margin: '20px 0' }} />
        <p style={{ fontSize: 12, color: '#888' }}>Customer: {inv.customer_name} — {inv.customer_email}</p>
        <p style={{ fontSize: 12, color: '#888' }}>Delivery: {inv.delivery_address}</p>
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

type Tab = 'discounts' | 'invoices' | 'analytics'

export default function SalesManagerDashboard() {
  const { user } = useAuth()
  const token = user?.token ?? ''

  const [tab, setTab] = useState<Tab>('discounts')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
  }, [])

  // ── Discount tab state ──────────────────────────────────────────────────────
  const [products, setProducts] = useState<DiscountProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [discountPct, setDiscountPct] = useState<string>('10')
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    setLoadingProducts(true)
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products?limit=200`)
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(() => showToast('Failed to load products', 'err'))
      .finally(() => setLoadingProducts(false))
  }, [showToast])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  function toggleProduct(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleApplyDiscount() {
    if (!selectedIds.size) return showToast('Select at least one product', 'err')
    const pct = parseFloat(discountPct)
    if (isNaN(pct) || pct <= 0 || pct > 100) return showToast('Discount must be 1–100%', 'err')

    setApplyingDiscount(true)
    try {
      const res = await salesService.applyDiscount(token, {
        product_ids: Array.from(selectedIds),
        discount_percent: pct,
      })
      // Refresh product list
      const fresh = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products?limit=200`)
      const d = await fresh.json()
      setProducts(d.products ?? [])
      setSelectedIds(new Set())
      showToast(`✓ ${res.updated_count} product(s) discounted. ${res.notified_users} user(s) notified.`, 'ok')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to apply discount', 'err')
    } finally {
      setApplyingDiscount(false)
    }
  }

  async function handleRemoveDiscount(productId: string, e: React.MouseEvent) {
    e.stopPropagation() // don't toggle checkbox
    setRemovingId(productId)
    try {
      await salesService.removeDiscount(token, productId)
      const fresh = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/products?limit=200`)
      const d = await fresh.json()
      setProducts(d.products ?? [])
      showToast('✓ Discount removed — price restored to original.', 'ok')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to remove discount', 'err')
    } finally {
      setRemovingId(null)
    }
  }

  // ── Invoice tab state ───────────────────────────────────────────────────────
  const [invStart, setInvStart] = useState(monthAgo())
  const [invEnd, setInvEnd] = useState(today())
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true)
    try {
      const data = await salesService.getInvoices(token, invStart, invEnd)
      setInvoices(data)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load invoices', 'err')
    } finally {
      setLoadingInvoices(false)
    }
  }, [token, invStart, invEnd, showToast])

  useEffect(() => {
    if (tab === 'invoices') fetchInvoices()
  }, [tab, fetchInvoices])

  function printInvoice(inv: Invoice) {
    const el = document.getElementById(`invoice-print-${inv.id}`)
    if (!el) return
    const html = el.innerHTML
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`
      <html><head><title>Invoice ${inv.id.slice(0,8).toUpperCase()}</title>
      <style>body{margin:0;padding:0;font-family:Inter,sans-serif;} @media print{body{-webkit-print-color-adjust:exact}}</style>
      </head><body>${html}</body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  // ── Analytics tab state ─────────────────────────────────────────────────────
  const [anaStart, setAnaStart] = useState(monthAgo())
  const [anaEnd, setAnaEnd] = useState(today())
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loadingAna, setLoadingAna] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    setLoadingAna(true)
    try {
      const data = await salesService.getAnalytics(token, anaStart, anaEnd)
      setAnalytics(data)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load analytics', 'err')
    } finally {
      setLoadingAna(false)
    }
  }, [token, anaStart, anaEnd, showToast])

  useEffect(() => {
    if (tab === 'analytics') fetchAnalytics()
  }, [tab, fetchAnalytics])

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabClass = (t: Tab) =>
    `px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      tab === t
        ? 'text-[#39ff14] bg-[#39ff14]/10 border border-[#39ff14]/30'
        : 'text-white/40 hover:text-white/70 border border-transparent'
    }`

  const inputCls =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:border-[#39ff14]/40 focus:outline-none'

  return (
    <div className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#39ff14]/60 text-xs uppercase tracking-widest mb-1 font-medium">Sales Manager</p>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Manage pricing, invoices and track revenue performance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button className={tabClass('discounts')} onClick={() => setTab('discounts')}>
          🏷️ Discounts
        </button>
        <button className={tabClass('invoices')} onClick={() => setTab('invoices')}>
          🧾 Invoices
        </button>
        <button className={tabClass('analytics')} onClick={() => setTab('analytics')}>
          📊 Analytics
        </button>
      </div>

      {/* ── Tab: Discounts ─────────────────────────────────────────────────── */}
      {tab === 'discounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product picker */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">Select Products</h2>
            <p className="text-white/40 text-xs mb-4">{selectedIds.size} selected</p>

            <input
              className={`${inputCls} w-full mb-4`}
              placeholder="Search products…"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
            />

            {loadingProducts ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 hide-scrollbar">
                {filteredProducts.map(p => {
                  const selected = selectedIds.has(p.id)
                  const pct = parseFloat(discountPct) || 0
                  const previewPrice = pct > 0 && selected
                    ? ((p.original_price ?? p.price) * (1 - pct / 100)).toFixed(2)
                    : null

                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-150 border ${
                        selected
                          ? 'bg-[#39ff14]/8 border-[#39ff14]/30'
                          : 'bg-white/3 border-white/6 hover:border-white/15'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                          selected ? 'border-[#39ff14] bg-[#39ff14]' : 'border-white/20'
                        }`}
                      >
                        {selected && <span className="text-black text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.discount_percent ? (
                            <>
                              <span className="text-xs text-white/35 line-through">₺{fmt(p.original_price ?? p.price)}</span>
                              <span className="text-xs text-[#39ff14] font-medium">₺{fmt(p.price)}</span>
                              <span className="text-xs bg-[#39ff14]/15 text-[#39ff14] px-1.5 py-0.5 rounded font-medium">
                                -{p.discount_percent}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-white/40">₺{fmt(p.price)}</span>
                          )}
                        </div>
                      </div>
                      {previewPrice && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-white/30">After discount</p>
                          <p className="text-sm font-semibold text-[#39ff14]">₺{previewPrice}</p>
                        </div>
                      )}
                      {p.discount_percent && !previewPrice && (
                        <button
                          onClick={(e) => handleRemoveDiscount(p.id, e)}
                          disabled={removingId === p.id}
                          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          style={{
                            background: 'rgba(255,80,80,0.08)',
                            color: '#ff6060',
                            border: '1px solid rgba(255,80,80,0.2)',
                          }}
                          title="Remove discount and restore original price"
                        >
                          {removingId === p.id ? (
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                            </span>
                          ) : '✕ Remove'}
                        </button>
                      )}
                    </button>
                  )
                })}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-white/30 py-8 text-sm">No products found</p>
                )}
              </div>
            )}
          </div>

          {/* Discount controls */}
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Apply Discount</h2>
              <label className="block text-xs text-white/40 mb-1">Discount Percentage</label>
              <div className="relative mb-4">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={discountPct}
                  onChange={e => setDiscountPct(e.target.value)}
                  className={`${inputCls} w-full pr-8`}
                />
                <span className="absolute right-3 top-2.5 text-white/30 text-sm">%</span>
              </div>

              <div className="glass-panel rounded-xl p-4 mb-4 border border-white/5">
                <p className="text-xs text-white/40 mb-1">Summary</p>
                <p className="text-sm text-white/70">{selectedIds.size} product(s) selected</p>
                <p className="text-sm text-white/70">{discountPct || '0'}% discount</p>
                <p className="text-xs text-white/40 mt-2">Wishlist owners will be notified automatically.</p>
              </div>

              <button
                onClick={handleApplyDiscount}
                disabled={applyingDiscount || !selectedIds.size}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: applyingDiscount || !selectedIds.size
                    ? 'rgba(57,255,20,0.15)'
                    : 'linear-gradient(135deg, #39ff14 0%, #2ff801 100%)',
                  color: applyingDiscount || !selectedIds.size ? '#39ff14' : '#000',
                }}
              >
                {applyingDiscount ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Applying…
                  </span>
                ) : `Apply ${discountPct || 0}% Discount`}
              </button>
            </div>

            {/* Quick-select discount buttons */}
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-white/40 mb-3">Quick Select</p>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15, 20, 25, 50].map(p => (
                  <button
                    key={p}
                    onClick={() => setDiscountPct(String(p))}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      discountPct === String(p)
                        ? 'bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/40'
                        : 'bg-white/5 text-white/50 border border-white/8 hover:bg-white/10'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Invoices ──────────────────────────────────────────────────── */}
      {tab === 'invoices' && (
        <div>
          {/* Hidden printable invoice divs */}
          {invoices.map(inv => <PrintableInvoice key={inv.id} inv={inv} />)}

          {/* Filters */}
          <div className="glass-panel rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-white/40 mb-1">Start Date</label>
              <input type="date" value={invStart} onChange={e => setInvStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">End Date</label>
              <input type="date" value={invEnd} onChange={e => setInvEnd(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={fetchInvoices}
              disabled={loadingInvoices}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(57,255,20,0.15)', color: '#39ff14', border: '1px solid rgba(57,255,20,0.3)' }}
            >
              {loadingInvoices ? 'Loading…' : 'Filter'}
            </button>
            <p className="text-white/30 text-xs ml-auto self-center">{invoices.length} invoice(s) found</p>
          </div>

          {/* Table */}
          {loadingInvoices ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center text-white/30">
              No invoices found for the selected period
            </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="text-left px-5 py-3 text-xs font-medium text-white/35 uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-white/35 uppercase tracking-wider">Customer</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-white/35 uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-white/35 uppercase tracking-wider">Items</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-white/35 uppercase tracking-wider">Total</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-white/35 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <tr
                        key={inv.id}
                        className="border-b border-white/4 hover:bg-white/3 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <code className="text-xs text-[#39ff14]/70 bg-[#39ff14]/5 px-2 py-1 rounded">
                            #{inv.id.slice(0, 8).toUpperCase()}
                          </code>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-white/80 font-medium">{inv.customer_name}</p>
                          <p className="text-white/35 text-xs">{inv.customer_email}</p>
                        </td>
                        <td className="px-5 py-4 text-white/50 text-xs">
                          {new Date(inv.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-5 py-4 text-white/50">{inv.items.length} item(s)</td>
                        <td className="px-5 py-4 text-right font-semibold text-white/90">₺{fmt(inv.total_amount)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => printInvoice(inv)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                              title="Print invoice"
                            >
                              🖨️ Print
                            </button>
                            <button
                              onClick={() => printInvoice(inv)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{ background: 'rgba(57,255,20,0.08)', color: '#39ff14', border: '1px solid rgba(57,255,20,0.2)' }}
                              title="Save as PDF (choose 'Save as PDF' in the print dialog)"
                            >
                              📄 PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Analytics ─────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div>
          {/* Date filter */}
          <div className="glass-panel rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-white/40 mb-1">Start Date</label>
              <input type="date" value={anaStart} onChange={e => setAnaStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">End Date</label>
              <input type="date" value={anaEnd} onChange={e => setAnaEnd(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={loadingAna}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(57,255,20,0.15)', color: '#39ff14', border: '1px solid rgba(57,255,20,0.3)' }}
            >
              {loadingAna ? 'Loading…' : 'Calculate'}
            </button>
          </div>

          {loadingAna ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
            </div>
          ) : analytics ? (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Revenue', value: analytics.total_revenue, color: '#39ff14', icon: '💰' },
                  { label: 'Total Cost (est.)', value: analytics.total_cost, color: '#2ff8ff', icon: '📦' },
                  {
                    label: analytics.total_profit >= 0 ? 'Total Profit' : 'Total Loss',
                    value: Math.abs(analytics.total_profit),
                    color: analytics.total_profit >= 0 ? '#39ff14' : '#ff5050',
                    icon: analytics.total_profit >= 0 ? '📈' : '📉',
                  },
                  { label: 'Invoices', value: analytics.invoice_count, color: '#ffd700', icon: '🧾', isCount: true },
                ].map(kpi => (
                  <div key={kpi.label} className="glass-panel rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ fontSize: 20 }}>{kpi.icon}</span>
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{kpi.label}</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: kpi.color }}>
                      {(kpi as { isCount?: boolean }).isCount ? kpi.value : `₺${fmt(kpi.value)}`}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-1">Daily Revenue & Profit</h2>
                <p className="text-white/30 text-xs mb-6">
                  {anaStart} → {anaEnd} · Cost estimated at 70% of invoice subtotal
                </p>
                <BarChart data={analytics.chart_data} />
              </div>
            </>
          ) : (
            <div className="glass-panel rounded-2xl p-16 text-center text-white/30">
              Select a date range and click Calculate to view analytics
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}