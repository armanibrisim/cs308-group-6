'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../../context/AuthContext'
import {
  DiscountProduct,
  salesService,
} from '../../../../services/salesService'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SalesManagerDiscountsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // product list
  const [products, setProducts] = useState<DiscountProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // selection + discount form
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [discountPct, setDiscountPct] = useState('')
  const [applying, setApplying] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  // search / filter
  const [search, setSearch] = useState('')
  const [filterDiscounted, setFilterDiscounted] = useState<'all' | 'discounted' | 'none'>('all')

  // feedback banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== 'sales_manager') router.replace('/login')
  }, [isLoading, router, user])

  // ── load products ────────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!user?.token) return
    setLoadingProducts(true)
    setFetchError(null)
    try {
      // fetch up to 200 products in one shot; paginate later if needed
      const [p1, p2] = await Promise.all([
        salesService.getProducts(user.token, 1, 100),
        salesService.getProducts(user.token, 2, 100),
      ])
      const all = [...p1.products, ...p2.products]
      // deduplicate – the second page will be empty when total ≤ 100
      const unique = Array.from(new Map(all.map((p) => [p.id, p])).values())
      setProducts(unique)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoadingProducts(false)
    }
  }, [user?.token])

  useEffect(() => {
    if (!isLoading && user?.role === 'sales_manager') loadProducts()
  }, [isLoading, user, loadProducts])

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchQ = !q || p.name.toLowerCase().includes(q)
      const hasDiscount = !!p.discount_percent
      const matchF =
        filterDiscounted === 'all' ||
        (filterDiscounted === 'discounted' && hasDiscount) ||
        (filterDiscounted === 'none' && !hasDiscount)
      return matchQ && matchF
    })
  }, [products, search, filterDiscounted])

  // ── selection helpers ────────────────────────────────────────────────────────
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const visibleIds = filtered.map((p) => p.id)
    const allSelected = visibleIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  // ── apply discount ────────────────────────────────────────────────────────────
  async function handleApplyDiscount() {
    if (!user?.token) return
    const pct = Number(discountPct)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setBanner({ type: 'error', message: 'Enter a discount between 1 and 100 %.' })
      return
    }
    if (selected.size === 0) {
      setBanner({ type: 'error', message: 'Select at least one product.' })
      return
    }
    setApplying(true)
    try {
      const res = await salesService.applyDiscount(user.token, {
        product_ids: [...selected],
        discount_percent: pct,
      })
      setBanner({
        type: 'success',
        message: `Applied ${pct}% discount to ${res.updated_count} product(s). ${res.notified_users} wishlist user(s) notified.`,
      })
      setSelected(new Set())
      setDiscountPct('')
      // refresh product list to show updated prices
      await loadProducts()
    } catch (err: unknown) {
      setBanner({ type: 'error', message: err instanceof Error ? err.message : 'Failed to apply discount' })
    } finally {
      setApplying(false)
    }
  }

  // ── remove discount ───────────────────────────────────────────────────────────
  async function handleRemoveDiscount(product: DiscountProduct) {
    if (!user?.token) return
    if (!window.confirm(`Remove discount from "${product.name}"?`)) return
    setRemoving(product.id)
    try {
      await salesService.removeDiscount(user.token, product.id)
      setBanner({ type: 'success', message: `Discount removed from "${product.name}".` })
      await loadProducts()
    } catch (err: unknown) {
      setBanner({ type: 'error', message: err instanceof Error ? err.message : 'Failed to remove discount' })
    } finally {
      setRemoving(null)
    }
  }

  // ── render guards ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return <main className="min-h-screen px-8 py-10 text-white/60">Loading…</main>
  }
  if (!user || user.role !== 'sales_manager') return null

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Sales Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Product Discounts</h1>
              <p className="mt-2 text-sm text-white/60">
                Select products and apply a discount percentage. Wishlist owners are automatically notified.
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
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="text-white/60 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Apply-discount action bar ── */}
        {selected.size > 0 && (
          <section className="glass-panel rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-primary">
                {selected.size} product{selected.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  placeholder="Discount %"
                  className="w-36 rounded-xl border border-white/20 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition focus:border-primary/40 placeholder:text-white/30"
                />
                <span className="text-white/50 text-sm">%</span>
              </div>
              <button
                type="button"
                onClick={handleApplyDiscount}
                disabled={applying}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {applying ? 'Applying…' : 'Apply Discount'}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* ── Filters ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="min-w-[220px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary/40"
            />
            <select
              value={filterDiscounted}
              onChange={(e) => setFilterDiscounted(e.target.value as typeof filterDiscounted)}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All products</option>
              <option value="discounted">Discounted only</option>
              <option value="none">No discount</option>
            </select>
            <button
              type="button"
              onClick={loadProducts}
              disabled={loadingProducts}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {loadingProducts ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </section>

        {/* ── Product table ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-5">
          {fetchError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-300">
              {fetchError}{' '}
              <button onClick={loadProducts} className="underline hover:text-white">
                Retry
              </button>
            </div>
          ) : loadingProducts ? (
            <div className="py-16 text-center text-white/40 text-sm">Loading products…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 py-12 text-center text-white/50">
              No products match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        className="accent-primary"
                      />
                    </th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Current Price</th>
                    <th className="px-3 py-3">Original Price</th>
                    <th className="px-3 py-3">Discount</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const isSelected = selected.has(product.id)
                    const hasDiscount = !!product.discount_percent
                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-white/5 transition ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(product.id)}
                            className="accent-primary"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                                <span className="material-symbols-outlined text-lg">inventory_2</span>
                              </div>
                            )}
                            <span className="font-medium text-white">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-white">
                          ₺{fmt(product.price)}
                        </td>
                        <td className="px-3 py-3 text-white/55">
                          {product.original_price ? `₺${fmt(product.original_price)}` : '—'}
                        </td>
                        <td className="px-3 py-3">
                          {hasDiscount ? (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                              {product.discount_percent?.toFixed(0)}% off
                            </span>
                          ) : (
                            <span className="text-white/30 text-xs">No discount</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {hasDiscount && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDiscount(product)}
                              disabled={removing === product.id}
                              className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              {removing === product.id ? 'Removing…' : 'Remove discount'}
                            </button>
                          )}
                        </td>
                      </tr>
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
