'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../context/AuthContext'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

interface Product {
  id: string
  name: string
  model: string
  serial_number: string
  description: string
  stock_quantity: number
  in_stock: boolean
  price: number
  warranty: string
  distributor: string
  category_id: string
  image_url?: string | null
  purchase_count?: number | null
  avg_rating?: number | null
}

interface Category {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  parent_category_id?: string | null
  icon?: string | null
  managed: boolean
  productCount: number
}

const EMPTY_FORM = {
  name: '', model: '', serial_number: '', description: '',
  price: '', stock_quantity: '', warranty: '', distributor: '',
  category_id: '', image_url: '',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem',
  background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.15)',
  borderRadius: '0.5rem', color: 'var(--c-text)', fontSize: '0.8rem',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.62rem', fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(var(--c-text-rgb), 0.5)', marginBottom: '0.4rem',
}

const errStyle: React.CSSProperties = {
  fontSize: '0.62rem', fontFamily: 'monospace', color: '#ef4444', marginTop: '0.25rem',
}

function CustomSelect({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (listRef.current && listRef.current.contains(e.target as Node)) return
      if (listRef.current === e.target) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onMouse)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        style={{
          ...inputStyle, width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left',
          color: value ? 'var(--c-text)' : 'rgba(var(--c-text-rgb), 0.35)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: 'rgba(var(--c-text-rgb), 0.35)', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          unfold_more
        </span>
      </button>

      {open && (
        <div ref={listRef} style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999,
          background: 'rgba(14,14,14,0.97)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(var(--c-text-rgb), 0.15)', borderRadius: '0.5rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          maxHeight: '200px', overflowY: 'auto',
        }}>
          {[{ value: '', label: placeholder }, ...options].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.6rem 0.8rem', fontSize: '0.78rem', fontFamily: 'Inter, sans-serif',
                background: value === opt.value ? 'rgba(var(--c-neon-rgb), 0.08)' : 'transparent',
                color: value === opt.value ? 'var(--c-neon)' : opt.value === '' ? 'rgba(var(--c-text-rgb), 0.4)' : 'rgba(var(--c-text-rgb), 0.75)',
                border: 'none', cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--c-text-rgb), 0.06)' }}
              onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const token = user?.token ?? ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [catList, setCatList] = useState<Category[]>([])

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL')
  const [catFilter, setCatFilter] = useState('')

  // Sort
  const [sortField, setSortField] = useState<'name' | 'price' | 'stock_quantity'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const handleSort = (field: 'name' | 'price' | 'stock_quantity') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'product_manager' && user.role !== 'admin') router.replace('/browse')
  }, [user, isLoading, router])

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API}/products?limit=100&page=1`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch { setError('Failed to load products.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    fetch(`${API}/categories`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCatList(d) }).catch(() => {})
  }, [])

  // Modal helpers
  const openCreate = () => { setEditProduct(null); setForm({ ...EMPTY_FORM }); setFormErrors({}); setShowModal(true) }
  const openEdit = (p: Product) => {
    setEditProduct(p)
    setForm({ name: p.name, model: p.model, serial_number: p.serial_number, description: p.description, price: String(p.price), stock_quantity: String(p.stock_quantity), warranty: p.warranty, distributor: p.distributor, category_id: p.category_id, image_url: p.image_url ?? '' })
    setFormErrors({}); setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditProduct(null) }
  const setField = (key: string, val: string) => { setForm(prev => ({ ...prev, [key]: val })); setFormErrors(prev => ({ ...prev, [key]: '' })) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.model.trim()) e.model = 'Required'
    if (!form.serial_number.trim()) e.serial_number = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) e.price = 'Must be > 0'
    if (form.stock_quantity === '' || isNaN(Number(form.stock_quantity)) || Number(form.stock_quantity) < 0) e.stock_quantity = 'Must be ≥ 0'
    if (!form.warranty.trim()) e.warranty = 'Required'
    if (!form.distributor.trim()) e.distributor = 'Required'
    if (!form.category_id) e.category_id = 'Required'
    return e
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setSubmitting(true)
    try {
      const body = { name: form.name.trim(), model: form.model.trim(), serial_number: form.serial_number.trim(), description: form.description.trim(), price: Number(form.price), stock_quantity: Number(form.stock_quantity), warranty: form.warranty.trim(), distributor: form.distributor.trim(), category_id: form.category_id, image_url: form.image_url.trim() || null }
      const url = editProduct ? `${API}/products/${editProduct.id}` : `${API}/products`
      const method = editProduct ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail || 'Error') }
      const saved: Product = await res.json()
      if (editProduct) setProducts(prev => prev.map(p => p.id === editProduct.id ? saved : p))
      else setProducts(prev => [saved, ...prev])
      showToast(`"${saved.name}" ${editProduct ? 'updated' : 'created'}.`, true)
      closeModal()
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed.', false) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`${API}/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.filter(p => p.id !== id))
      setDeleteId(null)
      showToast('Product deleted.', true)
    } catch { showToast('Failed to delete.', false) }
    finally { setDeleting(false) }
  }

  const catName = useCallback((id: string) => {
    const found = catList.find(c => c.id === id)
    if (found) return found.name
    return id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [catList])

  // All categories for filter dropdown: formal API + product-derived
  const allCatOptions = useMemo(() => {
    const apiIds = new Set(catList.map(c => c.id))
    const seen = new Set(apiIds)
    const derived: { id: string; name: string }[] = []
    for (const p of products) {
      if (!seen.has(p.category_id)) {
        seen.add(p.category_id)
        derived.push({ id: p.category_id, name: catName(p.category_id) })
      }
    }
    const all = [...catList.map(c => ({ id: c.id, name: c.name })), ...derived]
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }, [catList, products, catName])

  const filtered = useMemo(() => {
    const arr = products.filter(p => {
      if (stockFilter === 'IN_STOCK' && !p.in_stock) return false
      if (stockFilter === 'OUT_OF_STOCK' && p.in_stock) return false
      if (catFilter && p.category_id !== catFilter) return false
      const q = search.toLowerCase()
      return !q || p.name.toLowerCase().includes(q) || p.model.toLowerCase().includes(q) || catName(p.category_id).toLowerCase().includes(q)
    })
    arr.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortField === 'price') cmp = a.price - b.price
      else if (sortField === 'stock_quantity') cmp = a.stock_quantity - b.stock_quantity
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [products, stockFilter, catFilter, search, catName, sortField, sortDir])

  if (isLoading || !user || (user.role !== 'product_manager' && user.role !== 'admin')) return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Product Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Products</h1>
            </div>
            <Link href="/products-dashboard" className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-primary/40 hover:text-primary">
              ← Back to Dashboard
            </Link>
          </div>
        </section>

        <div className="space-y-5">

          {/* Search + Filters + Add */}
          <div className="glass-panel rounded-3xl border border-white/10" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

            {/* Top row: search + add */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'rgba(var(--c-text-rgb), 0.3)', pointerEvents: 'none' }}>search</span>
                <input type="text" placeholder="Search by name, model or category..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2.4rem' }} />
              </div>
              <button onClick={openCreate} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', background: 'var(--c-neon)', border: 'none', color: '#000', fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                Add Product
              </button>
            </div>

            {/* Bottom row: stock pills + category dropdown + result count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              {/* Stock filter pills */}
              {([['ALL', 'All'], ['IN_STOCK', 'In Stock'], ['OUT_OF_STOCK', 'Out of Stock']] as const).map(([val, label]) => {
                const active = stockFilter === val
                return (
                  <button key={val} onClick={() => setStockFilter(val)}
                    style={{
                      padding: '0.3rem 0.85rem', borderRadius: '9999px', border: `1px solid ${active ? 'rgba(var(--c-neon-rgb), 0.5)' : 'rgba(var(--c-text-rgb), 0.12)'}`,
                      background: active ? 'rgba(var(--c-neon-rgb), 0.12)' : 'transparent',
                      color: active ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.45)',
                      fontSize: '0.62rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{label}</button>
                )
              })}

              {/* Divider */}
              <div style={{ width: '1px', height: '18px', background: 'rgba(var(--c-text-rgb), 0.1)', flexShrink: 0 }} />

              {/* Category filter */}
              <div style={{ width: '190px' }}>
                <CustomSelect
                  value={catFilter}
                  onChange={setCatFilter}
                  options={allCatOptions.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="All Categories"
                />
              </div>

              {/* Clear filters */}
              {(stockFilter !== 'ALL' || catFilter || search) && (
                <button onClick={() => { setStockFilter('ALL'); setCatFilter(''); setSearch(''); setSortField('name'); setSortDir('asc') }}
                  style={{ padding: '0.3rem 0.7rem', borderRadius: '9999px', border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: 'rgba(239,68,68,0.5)', fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.5)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.7rem' }}>close</span>
                  Clear
                </button>
              )}

              {/* Result count */}
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.3)' }}>
                {filtered.length} / {products.length} products
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1fr 100px', gap: '0', padding: '0.7rem 1.5rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)', background: 'rgba(var(--c-text-rgb), 0.02)' }}>
              {([
                { label: 'Product', field: 'name' as const },
                { label: 'Category', field: null },
                { label: 'Price', field: 'price' as const },
                { label: 'Stock', field: 'stock_quantity' as const },
                { label: 'Status', field: null },
                { label: '', field: null },
              ]).map(({ label, field }, i) => (
                <div key={i} style={{ minWidth: 0, paddingRight: '0.75rem' }}>
                  {field ? (
                    <button onClick={() => handleSort(field)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: sortField === field ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.4)', transition: 'color 0.15s' }}>{label}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.7rem', color: sortField === field ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.2)', transition: 'color 0.15s' }}>
                        {sortField === field ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                      </span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>{label}</span>
                  )}
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}><div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(var(--c-neon-rgb),0.2)', borderTopColor: 'var(--c-neon)' }} /></div>
            ) : error ? (
              <div style={{ padding: '2rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.78rem' }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.7rem' }}>NO PRODUCTS FOUND</div>
            ) : filtered.map((p, idx) => (
              <div key={p.id}
                style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1fr 100px', gap: '0', padding: '0.875rem 1.5rem', alignItems: 'center', borderBottom: idx < filtered.length - 1 ? '1px solid rgba(var(--c-text-rgb), 0.05)' : 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--c-text-rgb), 0.025)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>

                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, paddingRight: '0.75rem' }}>
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} style={{ width: '2.25rem', height: '2.25rem', objectFit: 'contain', borderRadius: '0.4rem', background: 'rgba(var(--c-text-rgb), 0.05)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.4rem', background: 'rgba(var(--c-text-rgb), 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: 'rgba(var(--c-text-rgb), 0.2)' }}>image</span>
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.35)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.model}</p>
                  </div>
                </div>

                {/* Category */}
                <div style={{ minWidth: 0, paddingRight: '0.75rem' }}>
                  <p style={{ fontSize: '0.72rem', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-neon)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>{catName(p.category_id)}</p>
                </div>

                {/* Price */}
                <div style={{ minWidth: 0, paddingRight: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: 'var(--c-text)', whiteSpace: 'nowrap' }}>${p.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>

                {/* Stock */}
                <div style={{ minWidth: 0, paddingRight: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: p.stock_quantity === 0 ? '#ef4444' : p.stock_quantity < 5 ? '#f59e0b' : 'var(--c-text)' }}>{p.stock_quantity}</p>
                </div>

                {/* Status */}
                <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.55rem', borderRadius: '9999px', background: p.in_stock ? 'rgba(var(--c-neon-rgb), 0.10)' : 'rgba(239,68,68,0.10)', color: p.in_stock ? 'var(--c-neon)' : '#ef4444', border: `1px solid ${p.in_stock ? 'rgba(var(--c-neon-rgb), 0.20)' : 'rgba(239,68,68,0.25)'}`, fontSize: '0.53rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {p.in_stock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  {deleteId === p.id ? (
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.58rem', color: '#ef4444', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Sure?</span>
                      <button onClick={() => setDeleteId(null)} style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid rgba(var(--c-text-rgb), 0.15)', color: 'rgba(var(--c-text-rgb), 0.45)', fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: 'pointer' }}>No</button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting} style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>{deleting ? '...' : 'Yes'}</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button onClick={() => openEdit(p)} style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid rgba(var(--c-text-rgb), 0.12)', color: 'rgba(var(--c-text-rgb), 0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-neon)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-neon)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.45)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>edit</span>
                      </button>
                      <button onClick={() => setDeleteId(p.id)} style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.45)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create / Edit Modal */}
          {showModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
              onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
              <div style={{ background: 'rgba(8,8,12,0.99)', border: '1px solid rgba(var(--c-text-rgb), 0.10)', borderRadius: '1.75rem', width: '100%', maxWidth: '700px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 100px rgba(0,0,0,0.8)' }}>

                {/* ── Sticky header ── */}
                <div style={{ padding: '1.75rem 2rem 1.25rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'rgba(var(--c-neon-rgb), 0.10)', border: '1px solid rgba(var(--c-neon-rgb), 0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.3rem', color: 'var(--c-neon)' }}>{editProduct ? 'edit' : 'add_box'}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--c-neon)', opacity: 0.7, marginBottom: '0.2rem' }}>
                      {editProduct ? 'Edit Product' : 'New Product'}
                    </p>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editProduct ? editProduct.name : 'Add a new product'}
                    </h2>
                  </div>
                  <button onClick={closeModal} style={{ background: 'rgba(var(--c-text-rgb), 0.04)', border: '1px solid rgba(var(--c-text-rgb), 0.10)', borderRadius: '0.6rem', padding: '0.5rem', cursor: 'pointer', color: 'rgba(var(--c-text-rgb), 0.4)', display: 'flex', transition: 'all 0.15s', flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.10)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.4)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                  </button>
                </div>

                {/* ── Scrollable body ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

                  {/* Section: Basic Info */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: 'var(--c-neon)' }} />
                      <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>Basic Info</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Product Name *</label>
                        <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Samsung Galaxy S24" style={{ ...inputStyle, borderColor: formErrors.name ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.name && <p style={errStyle}>{formErrors.name}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>Model *</label>
                        <input value={form.model} onChange={e => setField('model', e.target.value)} placeholder="e.g. SM-S921B" style={{ ...inputStyle, borderColor: formErrors.model ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.model && <p style={errStyle}>{formErrors.model}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>Serial Number *</label>
                        <input value={form.serial_number} onChange={e => setField('serial_number', e.target.value)} placeholder="e.g. SN-001" style={{ ...inputStyle, borderColor: formErrors.serial_number ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.serial_number && <p style={errStyle}>{formErrors.serial_number}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section: Pricing & Inventory */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#818cf8' }} />
                      <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>Pricing &amp; Inventory</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                      <div>
                        <label style={labelStyle}>Price ($) *</label>
                        <input type="number" min="0.01" step="0.01" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="0.00" style={{ ...inputStyle, borderColor: formErrors.price ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.price && <p style={errStyle}>{formErrors.price}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>Stock *</label>
                        <input type="number" min="0" step="1" value={form.stock_quantity} onChange={e => setField('stock_quantity', e.target.value)} placeholder="0" style={{ ...inputStyle, borderColor: formErrors.stock_quantity ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.stock_quantity && <p style={errStyle}>{formErrors.stock_quantity}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>Category *</label>
                        <CustomSelect value={form.category_id} onChange={v => setField('category_id', v)} options={allCatOptions.map(c => ({ value: c.id, label: c.name }))} placeholder="Select" />
                        {formErrors.category_id && <p style={errStyle}>{formErrors.category_id}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section: Details */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#f59e0b' }} />
                      <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>Details</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                      <div>
                        <label style={labelStyle}>Warranty *</label>
                        <input value={form.warranty} onChange={e => setField('warranty', e.target.value)} placeholder="e.g. 2 years" style={{ ...inputStyle, borderColor: formErrors.warranty ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.warranty && <p style={errStyle}>{formErrors.warranty}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>Distributor *</label>
                        <input value={form.distributor} onChange={e => setField('distributor', e.target.value)} placeholder="e.g. Samsung Electronics" style={{ ...inputStyle, borderColor: formErrors.distributor ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.distributor && <p style={errStyle}>{formErrors.distributor}</p>}
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Description *</label>
                        <textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Product description..." rows={3} style={{ ...inputStyle, resize: 'vertical', borderColor: formErrors.description ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }} />
                        {formErrors.description && <p style={errStyle}>{formErrors.description}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section: Media */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ec4899' }} />
                      <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>Media <span style={{ opacity: 0.5, fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>(optional)</span></span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      {form.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.image_url} alt="preview" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          style={{ width: '5rem', height: '5rem', objectFit: 'contain', borderRadius: '0.75rem', background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.10)', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Image URL</label>
                        <input value={form.image_url} onChange={e => setField('image_url', e.target.value)} placeholder="https://example.com/image.jpg" style={inputStyle} />
                        <p style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.25)', marginTop: '0.3rem' }}>Preview appears automatically when URL is valid</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── Sticky footer ── */}
                <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid rgba(var(--c-text-rgb), 0.07)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--c-text-rgb), 0.01)' }}>
                  <p style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.25)' }}>
                    * Required fields
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={closeModal} style={{ padding: '0.6rem 1.25rem', borderRadius: '0.6rem', background: 'transparent', border: '1px solid rgba(var(--c-text-rgb), 0.15)', color: 'rgba(var(--c-text-rgb), 0.55)', fontSize: '0.72rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                      style={{ padding: '0.6rem 1.5rem', borderRadius: '0.6rem', background: submitting ? 'rgba(var(--c-neon-rgb),0.4)' : 'var(--c-neon)', border: 'none', color: '#000', fontSize: '0.72rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = '' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>{submitting ? 'progress_activity' : editProduct ? 'save' : 'add'}</span>
                      {submitting ? 'Saving...' : editProduct ? 'Save Changes' : 'Create Product'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, padding: '0.875rem 1.5rem', borderRadius: '0.75rem', background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`, color: toast.ok ? '#22c55e' : '#ef4444', fontSize: '0.78rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
              {toast.msg}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
