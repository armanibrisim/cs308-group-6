'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../../context/AuthContext'
import {
  type CategoryOption,
  type ProductCreatePayload,
  productService,
} from '../../../../services/productService'
import {
  DiscountProduct,
  salesService,
} from '../../../../services/salesService'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fieldCls =
  'w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition focus:border-primary/40 placeholder:text-white/30'

type ProductCreateFormState = {
  name: string
  model: string
  serial_number: string
  description: string
  stock_quantity: string
  price: string
  warranty: string
  distributor: string
  category_id: string
  image_url: string
}

const EMPTY_PRODUCT_FORM: ProductCreateFormState = {
  name: '',
  model: '',
  serial_number: '',
  description: '',
  stock_quantity: '0',
  price: '',
  warranty: '',
  distributor: '',
  category_id: '',
  image_url: '',
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

  // create product
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [createForm, setCreateForm] = useState<ProductCreateFormState>(EMPTY_PRODUCT_FORM)
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [categorySource, setCategorySource] = useState<'categories' | 'products_fallback' | null>(null)
  const [categoryLoadState, setCategoryLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [creatingProduct, setCreatingProduct] = useState(false)

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

  useEffect(() => {
    if (isLoading || user?.role !== 'sales_manager') return
    setCategoryLoadState('loading')
    setCategorySource(null)
    productService
      .getCategoryOptionsWithFallback()
      .then(({ options, source }) => {
        setCategoryOptions(options)
        setCategorySource(source)
        setCategoryLoadState(options.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => {
        setCategoryOptions([])
        setCategorySource(null)
        setCategoryLoadState('error')
        setBanner({ type: 'error', message: 'Failed to load categories for the create form.' })
      })
  }, [isLoading, user?.role])

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
  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault()
    if (!user?.token) return

    const price = parseFloat(createForm.price)
    const stock = parseInt(createForm.stock_quantity, 10)
    if (!createForm.name.trim()) {
      setBanner({ type: 'error', message: 'Product name is required.' })
      return
    }
    if (!createForm.model.trim()) {
      setBanner({ type: 'error', message: 'Model is required.' })
      return
    }
    if (!createForm.serial_number.trim()) {
      setBanner({ type: 'error', message: 'Serial number is required.' })
      return
    }
    if (!createForm.description.trim()) {
      setBanner({ type: 'error', message: 'Description is required.' })
      return
    }
    if (!createForm.warranty.trim()) {
      setBanner({ type: 'error', message: 'Warranty is required.' })
      return
    }
    if (!createForm.distributor.trim()) {
      setBanner({ type: 'error', message: 'Distributor is required.' })
      return
    }
    if (!createForm.category_id.trim()) {
      setBanner({
        type: 'error',
        message:
          categoryOptions.length === 0
            ? 'No categories available — add categories or products with category_id.'
            : 'Please select a category from the list.',
      })
      return
    }
    if (Number.isNaN(price) || price <= 0) {
      setBanner({ type: 'error', message: 'Price must be greater than 0.' })
      return
    }
    if (Number.isNaN(stock) || stock < 0) {
      setBanner({ type: 'error', message: 'Stock must be 0 or more.' })
      return
    }

    const payload: ProductCreatePayload = {
      name: createForm.name.trim(),
      model: createForm.model.trim(),
      serial_number: createForm.serial_number.trim(),
      description: createForm.description.trim(),
      stock_quantity: stock,
      price,
      warranty: createForm.warranty.trim(),
      distributor: createForm.distributor.trim(),
      category_id: createForm.category_id.trim(),
      image_url: createForm.image_url.trim() || undefined,
    }

    setCreatingProduct(true)
    try {
      const created = await productService.createProduct(user.token, payload)
      await loadProducts()
      setCreateForm({ ...EMPTY_PRODUCT_FORM })
      setSelected((prev) => new Set(prev).add(created.id))
      setBanner({
        type: 'success',
        message: `Product "${created.name}" created — it is selected below so you can apply a discount.`,
      })
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create product.',
      })
    } finally {
      setCreatingProduct(false)
    }
  }

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

        {/* ── Add new product ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <button
            type="button"
            onClick={() => setShowCreateProduct((s) => !s)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">Add new product</h2>
              <p className="mt-1 text-sm text-white/55">
                Create a catalog item (price &gt; 0, required fields). It appears in the table below.
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-primary">
              {showCreateProduct ? '▲ Hide' : '▼ Show'}
            </span>
          </button>

          {showCreateProduct && (
            <form onSubmit={handleCreateProduct} className="mt-6 space-y-4 border-t border-white/10 pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-white/45">Name</label>
                  <input
                    required
                    className={fieldCls}
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Model</label>
                  <input
                    required
                    className={fieldCls}
                    value={createForm.model}
                    onChange={(e) => setCreateForm((f) => ({ ...f, model: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Serial number</label>
                  <input
                    required
                    className={fieldCls}
                    value={createForm.serial_number}
                    onChange={(e) => setCreateForm((f) => ({ ...f, serial_number: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-white/45">Description</label>
                  <textarea
                    required
                    rows={3}
                    className={`${fieldCls} min-h-[72px] resize-y`}
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Price (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    required
                    className={fieldCls}
                    value={createForm.price}
                    onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Stock quantity</label>
                  <input
                    type="number"
                    min={0}
                    required
                    className={fieldCls}
                    value={createForm.stock_quantity}
                    onChange={(e) => setCreateForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Warranty</label>
                  <input
                    required
                    className={fieldCls}
                    value={createForm.warranty}
                    onChange={(e) => setCreateForm((f) => ({ ...f, warranty: e.target.value }))}
                    placeholder="e.g. 2 years"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Distributor</label>
                  <input
                    required
                    className={fieldCls}
                    value={createForm.distributor}
                    onChange={(e) => setCreateForm((f) => ({ ...f, distributor: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-white/45">Category</label>
                  <select
                    required={categoryOptions.length > 0}
                    className={`${fieldCls} bg-[#141414] text-white`}
                    style={{ colorScheme: 'dark' }}
                    value={createForm.category_id}
                    onChange={(e) => setCreateForm((f) => ({ ...f, category_id: e.target.value }))}
                    disabled={categoryLoadState === 'loading' || categoryOptions.length === 0}
                    aria-busy={categoryLoadState === 'loading'}
                    aria-invalid={categoryLoadState === 'empty' || categoryLoadState === 'error'}
                  >
                    <option value="" disabled>
                      {categoryLoadState === 'loading'
                        ? 'Loading categories…'
                        : categoryLoadState === 'error'
                          ? 'Could not load categories'
                          : categoryOptions.length === 0
                            ? 'No categories available'
                            : 'Select a category'}
                    </option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#141414] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categoryLoadState === 'loading' && (
                    <p className="mt-1.5 text-xs text-white/40">Loading category list…</p>
                  )}
                  {categoryLoadState === 'error' && (
                    <p className="mt-1.5 text-xs text-rose-300/90">
                      Could not load categories. Check that the API is running and refresh the page.
                    </p>
                  )}
                  {categoryLoadState === 'empty' && (
                    <p className="mt-1.5 text-xs text-amber-300/95">
                      No categories available. Seed the <code className="text-amber-200/90">categories</code>{' '}
                      collection or add products with a <code className="text-amber-200/90">category_id</code>.
                    </p>
                  )}
                  {categorySource === 'products_fallback' && categoryOptions.length > 0 && (
                    <p className="mt-1.5 text-xs text-white/40">
                      Categories inferred from existing products (API category list was empty).
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-white/45">Image URL (optional)</label>
                  <input
                    type="text"
                    className={fieldCls}
                    value={createForm.image_url}
                    onChange={(e) => setCreateForm((f) => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    creatingProduct || categoryLoadState === 'loading' || categoryOptions.length === 0
                  }
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creatingProduct ? 'Creating…' : 'Create product'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...EMPTY_PRODUCT_FORM })}
                  className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-white/70 transition hover:border-white/40"
                >
                  Reset form
                </button>
              </div>
            </form>
          )}
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
