'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardPageHeader, PRODUCT_MANAGER_HEADER } from '../../../../components/dashboard/DashboardPageHeader'
import { useAuth } from '../../../../context/AuthContext'
import { ApiError } from '../../../../services/api'
import { productService } from '../../../../services/productService'

interface StockProduct {
  id: string
  name: string
  model: string
  category_id: string
  stock_quantity: number
  in_stock: boolean
}

interface CategoryOption {
  id: string
  name: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.55rem 0.75rem',
  background: 'rgba(var(--c-text-rgb), 0.05)',
  border: '1px solid rgba(var(--c-text-rgb), 0.15)',
  borderRadius: '0.5rem',
  color: 'var(--c-text)',
  fontSize: '0.8rem',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
}

const stockInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: '5rem',
  padding: '0.4rem 0.5rem',
  textAlign: 'right' as const,
}

function normalizeStockProduct(raw: Record<string, unknown>): StockProduct {
  const stockQty = Number(raw.stock_quantity ?? raw.stockQuantity ?? 0)
  const safeQty = Number.isFinite(stockQty) ? Math.max(0, Math.trunc(stockQty)) : 0
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    model: String(raw.model ?? ''),
    category_id: String(raw.category_id ?? raw.categoryId ?? ''),
    stock_quantity: safeQty,
    in_stock: typeof raw.in_stock === 'boolean' ? raw.in_stock : safeQty > 0,
  }
}

function stockErrorMessage(err: unknown, fallback = 'Failed to update stock. Please try again.'): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Session expired. Please log in again.'
    if (err.status === 403) return 'You do not have permission to update stock.'
    if (err.status === 404) return 'Product not found.'
    if (err.status === 422) return err.message || 'Invalid stock quantity.'
    if (err.status >= 500) return 'Failed to load products. Please try again later.'
    return err.message
  }
  if (err instanceof TypeError) return 'Could not connect to the server. Check that the backend is running.'
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export default function StockPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const token = user?.token ?? ''

  const [products, setProducts] = useState<StockProduct[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL')
  const [sortField, setSortField] = useState<'name' | 'stock_quantity'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'product_manager' && user.role !== 'admin') router.replace('/browse')
  }, [user, isLoading, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [productsRes, cats] = await Promise.all([
        productService.getAllProducts(),
        productService.getCategories().catch(() => []),
      ])
      const list = (productsRes.products ?? []).map(p =>
        normalizeStockProduct(p as unknown as Record<string, unknown>),
      )
      setProducts(list.filter(p => p.id))
      setCategories(
        (cats ?? []).map(c => ({
          id: c.id,
          name: (c as { name?: string }).name ?? c.id,
        })),
      )
      setDrafts({})
    } catch (err) {
      setError(stockErrorMessage(err, 'Failed to load products.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && user && (user.role === 'product_manager' || user.role === 'admin')) {
      void loadData()
    }
  }, [isLoading, user, loadData])

  const catName = useCallback(
    (id: string) => {
      const found = categories.find(c => c.id === id)
      if (found) return found.name
      return id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    },
    [categories],
  )

  const handleSort = (field: 'name' | 'stock_quantity') => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const arr = products.filter(p => {
      if (stockFilter === 'IN_STOCK' && !p.in_stock) return false
      if (stockFilter === 'OUT_OF_STOCK' && p.in_stock) return false
      const q = search.toLowerCase()
      return (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        catName(p.category_id).toLowerCase().includes(q)
      )
    })
    arr.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = a.stock_quantity - b.stock_quantity
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [products, stockFilter, search, catName, sortField, sortDir])

  const setDraft = (productId: string, value: string) => {
    setDrafts(prev => ({ ...prev, [productId]: value }))
  }

  const handleSave = async (product: StockProduct) => {
    if (!token) {
      showToast('Session expired. Please log in again.', false)
      return
    }
    const raw = drafts[product.id] ?? String(product.stock_quantity)
    const qty = Number(raw)
    if (raw === '' || Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      showToast('Stock must be a whole number ≥ 0.', false)
      return
    }
    if (qty === product.stock_quantity) {
      setDrafts(prev => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      return
    }

    setSavingId(product.id)
    try {
      const updated = await productService.updateStock(product.id, qty, token)
      setProducts(prev =>
        prev.map(p =>
          p.id === product.id
            ? { ...p, stock_quantity: updated.stock_quantity, in_stock: updated.in_stock }
            : p,
        ),
      )
      setDrafts(prev => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      showToast(`Stock updated for "${product.name}".`, true)
    } catch (err) {
      showToast(stockErrorMessage(err), false)
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading || !user || (user.role !== 'product_manager' && user.role !== 'admin')) return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        <DashboardPageHeader
          {...PRODUCT_MANAGER_HEADER}
          title="Stock Management"
        />

        <div
          className="glass-panel rounded-3xl border border-white/10"
          style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
        >
          <div style={{ position: 'relative' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1rem',
                color: 'rgba(var(--c-text-rgb), 0.3)',
                pointerEvents: 'none',
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, model or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '2.4rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            {([['ALL', 'All'], ['IN_STOCK', 'In Stock'], ['OUT_OF_STOCK', 'Out of Stock']] as const).map(([val, label]) => {
              const active = stockFilter === val
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStockFilter(val)}
                  style={{
                    padding: '0.3rem 0.85rem',
                    borderRadius: '9999px',
                    border: `1px solid ${active ? 'rgba(var(--c-neon-rgb), 0.5)' : 'rgba(var(--c-text-rgb), 0.12)'}`,
                    background: active ? 'rgba(var(--c-neon-rgb), 0.12)' : 'transparent',
                    color: active ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.45)',
                    fontSize: '0.62rem',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
            {(stockFilter !== 'ALL' || search) && (
              <button
                type="button"
                onClick={() => {
                  setStockFilter('ALL')
                  setSearch('')
                }}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(239,68,68,0.25)',
                  background: 'transparent',
                  color: 'rgba(239,68,68,0.5)',
                  fontSize: '0.58rem',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.3)' }}>
              {filtered.length} / {products.length} products
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 140px',
              gap: 0,
              padding: '0.7rem 1.5rem',
              borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)',
              background: 'rgba(var(--c-text-rgb), 0.02)',
            }}
          >
            {(
              [
                { label: 'Product', field: 'name' as const },
                { label: 'Category', field: null },
                { label: 'Current Stock', field: 'stock_quantity' as const },
                { label: 'Status', field: null },
                { label: 'Actions', field: null },
              ] as const
            ).map(({ label, field }) => (
              <div key={label} style={{ minWidth: 0, paddingRight: '0.75rem' }}>
                {field ? (
                  <button
                    type="button"
                    onClick={() => handleSort(field)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.58rem',
                        fontFamily: 'Space Grotesk, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: sortField === field ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.4)',
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '0.7rem',
                        color: sortField === field ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.2)',
                      }}
                    >
                      {sortField === field ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 700,
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      color: 'rgba(var(--c-text-rgb), 0.4)',
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
                style={{ borderColor: 'rgba(var(--c-neon-rgb),0.2)', borderTopColor: 'var(--c-neon)' }}
              />
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.78rem' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'rgba(var(--c-text-rgb), 0.3)',
                fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '0.2em',
                fontSize: '0.7rem',
              }}
            >
              NO PRODUCTS FOUND
            </div>
          ) : (
            filtered.map((p, idx) => {
              const draftVal = drafts[p.id] ?? String(p.stock_quantity)
              const isDirty = draftVal !== String(p.stock_quantity)
              const isSaving = savingId === p.id
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 140px',
                    gap: 0,
                    padding: '0.875rem 1.5rem',
                    alignItems: 'center',
                    borderBottom:
                      idx < filtered.length - 1 ? '1px solid rgba(var(--c-text-rgb), 0.05)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: '0.75rem' }}>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        fontFamily: 'Space Grotesk, sans-serif',
                        color: 'var(--c-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      style={{
                        fontSize: '0.58rem',
                        fontFamily: 'monospace',
                        color: 'rgba(var(--c-text-rgb), 0.35)',
                        marginTop: '2px',
                      }}
                    >
                      {p.model}
                    </p>
                  </div>
                  <div style={{ minWidth: 0, paddingRight: '0.75rem' }}>
                    <p
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'Space Grotesk, sans-serif',
                        color: 'var(--c-neon)',
                        opacity: 0.85,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {catName(p.category_id)}
                    </p>
                  </div>
                  <div style={{ paddingRight: '0.75rem' }}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftVal}
                      disabled={isSaving}
                      onChange={e => setDraft(p.id, e.target.value)}
                      style={{
                        ...stockInputStyle,
                        borderColor: isDirty ? 'rgba(var(--c-neon-rgb), 0.45)' : 'rgba(var(--c-text-rgb), 0.15)',
                        color:
                          p.stock_quantity === 0
                            ? '#ef4444'
                            : p.stock_quantity < 5
                              ? '#f59e0b'
                              : 'var(--c-text)',
                      }}
                    />
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: p.in_stock ? 'rgba(var(--c-neon-rgb), 0.10)' : 'rgba(239,68,68,0.10)',
                        color: p.in_stock ? 'var(--c-neon)' : '#ef4444',
                        border: `1px solid ${p.in_stock ? 'rgba(var(--c-neon-rgb), 0.20)' : 'rgba(239,68,68,0.25)'}`,
                        fontSize: '0.53rem',
                        fontFamily: 'Space Grotesk, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={isSaving || !isDirty}
                      onClick={() => void handleSave(p)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.4rem',
                        background: isDirty && !isSaving ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.06)',
                        border: 'none',
                        color: isDirty && !isSaving ? '#000' : 'rgba(var(--c-text-rgb), 0.35)',
                        fontSize: '0.58rem',
                        fontFamily: 'Space Grotesk, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>
                        {isSaving ? 'progress_activity' : 'check'}
                      </span>
                      {isSaving ? 'Saving' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            padding: '0.875rem 1.5rem',
            borderRadius: '0.75rem',
            background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
            color: toast.ok ? '#22c55e' : '#ef4444',
            fontSize: '0.78rem',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}
    </main>
  )
}
