'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { reviewService, Review } from '../../../services/reviewService'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

type TabType = 'COMMENTS' | 'PRODUCTS' | 'CATEGORIES' | 'STOCK' | 'DELIVERIES'
type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
type DeliveryFilter = 'ALL' | 'PENDING' | 'COMPLETED'

interface Delivery {
  id: string
  customer_id: string
  product_id: string
  product_name: string | null
  quantity: number
  total_price: number
  delivery_address: string
  is_completed: boolean
  order_id: string | null
  created_at: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="material-symbols-outlined text-xs"
          style={{ fontVariationSettings: i < rating ? "'FILL' 1" : "'FILL' 0", color: i < rating ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.25)', fontSize: '0.85rem' }}
        >
          star
        </span>
      ))}
    </div>
  )
}

// ── Category types ────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  parent_category_id?: string | null
  managed: boolean      // true = formal API kaydı var (edit/delete yapılabilir)
  productCount: number  // bu kategoriyi kullanan ürün sayısı
}

// ── Categories view ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem',
  background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.15)',
  borderRadius: '0.5rem', color: 'var(--c-text)', fontSize: '0.8rem',
  fontFamily: 'Inter, sans-serif', outline: 'none',
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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
        <div style={{
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

function CategoriesView({ token }: { token: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // New category form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newParent, setNewParent] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Inline edit state: editId → { name, description, parent_category_id }
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editParent, setEditParent] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [apiResult, prodsResult] = await Promise.allSettled([
        fetch(`${API}/categories`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch(`${API}/products?limit=500&page=1`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
      ])

      // Ürünlerden kategori başına sayı hesapla
      const counts: Record<string, number> = {}
      if (prodsResult.status === 'fulfilled') {
        const prods: any[] = prodsResult.value.products ?? prodsResult.value ?? []
        for (const p of prods) {
          const cat = p.category_id || p.categoryId
          if (cat) counts[cat] = (counts[cat] || 0) + 1
        }
      }

      // Formal API kategorileri
      const apiCats: Category[] = []
      const apiIds = new Set<string>()
      if (apiResult.status === 'fulfilled' && Array.isArray(apiResult.value)) {
        for (const c of apiResult.value) {
          apiCats.push({ ...c, managed: true, productCount: counts[c.id] ?? 0 })
          apiIds.add(c.id)
        }
      }

      // Ürünlerden türetilen ama API'de olmayan kategoriler
      const derivedCats: Category[] = Object.entries(counts)
        .filter(([id]) => !apiIds.has(id))
        .map(([id, count]) => ({
          id,
          name: id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          managed: false,
          productCount: count,
        }))

      const all = [...apiCats, ...derivedCats].sort((a, b) => b.productCount - a.productCount)
      setCategories(all)
    } catch { setError('Failed to load categories.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  // ── Create ──
  const handleCreate = async () => {
    if (!newName.trim()) { setCreateError('Name is required.'); return }
    setCreating(true); setCreateError(null)
    try {
      const body: Record<string, string> = { name: newName.trim() }
      if (newDesc.trim()) body.description = newDesc.trim()
      if (newParent) body.parent_category_id = newParent
      const res = await fetch(`${API}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail || 'Error') }
      const created: Category = { ...(await res.json()), managed: true, productCount: 0 }
      setCategories(prev => [...prev, created])
      setNewName(''); setNewDesc(''); setNewParent('')
      showToast(`"${created.name}" created.`, true)
    } catch (err) { setCreateError(err instanceof Error ? err.message : 'Failed.') }
    finally { setCreating(false) }
  }

  // ── Delete ──
  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`${API}/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setCategories(prev => prev.filter(c => c.id !== id))
      setDeleteId(null)
      showToast('Category deleted.', true)
    } catch { showToast('Failed to delete.', false) }
    finally { setDeleting(false) }
  }

  // ── Edit ──
  const startEdit = (c: Category) => {
    setEditId(c.id); setEditName(c.name); setEditDesc(c.description ?? ''); setEditParent(c.parent_category_id ?? '')
  }
  const cancelEdit = () => setEditId(null)

  const handleSave = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const body: Record<string, string> = { name: editName.trim() }
      if (editDesc.trim()) body.description = editDesc.trim()
      if (editParent) body.parent_category_id = editParent
      const res = await fetch(`${API}/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const raw = await res.json()
      const updated: Category = { ...raw, managed: true, productCount: categories.find(c => c.id === id)?.productCount ?? 0 }
      setCategories(prev => prev.map(c => c.id === id ? updated : c))
      setEditId(null)
      showToast(`"${updated.name}" updated.`, true)
    } catch { showToast('Failed to update.', false) }
    finally { setSaving(false) }
  }

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const parentName = (id: string) => categories.find(c => c.id === id)?.name ?? id

  return (
    <div className="space-y-5">

      {/* ── Single panel ── */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">

        {/* Panel header + search */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', background: 'rgba(var(--c-text-rgb), 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '160px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--c-neon)', opacity: 0.7 }}>category</span>
            <span style={{ fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.55)' }}>
              Categories <span style={{ color: 'var(--c-neon)', marginLeft: '0.5rem' }}>{categories.length}</span>
            </span>
          </div>
          <div style={{ position: 'relative', width: '220px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.95rem', color: 'rgba(var(--c-text-rgb), 0.3)', pointerEvents: 'none' }}>search</span>
            <input
              type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '2.2rem', fontSize: '0.75rem' }}
            />
          </div>
        </div>

        {/* ── New category form row ── */}
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(var(--c-neon-rgb), 0.10)', background: 'rgba(var(--c-neon-rgb), 0.03)' }}>
          <p style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--c-neon)', marginBottom: '0.75rem', opacity: 0.8 }}>
            + New Category
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr auto', gap: '0.75rem', alignItems: 'start' }}>
            <div>
              <input
                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Category name *"
                style={{ ...inputStyle, borderColor: createError && !newName.trim() ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              />
            </div>
            <div>
              <input
                type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                style={inputStyle}
              />
            </div>
            <CustomSelect
              value={newParent}
              onChange={setNewParent}
              options={categories.filter(c => c.managed).map(c => ({ value: c.id, label: c.name }))}
              placeholder="No parent"
            />
            <button
              onClick={handleCreate} disabled={creating}
              style={{
                padding: '0.55rem 1.1rem', borderRadius: '0.5rem', border: 'none',
                background: creating ? 'rgba(var(--c-neon-rgb),0.4)' : 'var(--c-neon)',
                color: '#000', fontSize: '0.68rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: creating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap',
                transition: 'filter 0.15s',
              }}
              onMouseEnter={e => { if (!creating) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = '' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>{creating ? 'progress_activity' : 'add'}</span>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
          {createError && <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#ef4444', marginTop: '0.5rem' }}>{createError}</p>}
        </div>

        {/* ── Table header ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 140px', gap: '1rem', padding: '0.75rem 2rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)', background: 'rgba(var(--c-text-rgb), 0.02)' }}>
          {['Category', 'Description', 'Type', ''].map((col, i) => (
            <span key={i} style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>{col}</span>
          ))}
        </div>

        {/* ── Rows ── */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(var(--c-neon-rgb),0.2)', borderTopColor: 'var(--c-neon)' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.78rem' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.7rem' }}>
            NO CATEGORIES FOUND
          </div>
        ) : (
          filtered.map((c, idx) => {
            const isEditing = editId === c.id
            return (
              <div
                key={c.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 140px', gap: '1rem',
                  padding: isEditing ? '1rem 2rem' : '0.9rem 2rem', alignItems: 'center',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(var(--c-text-rgb), 0.05)' : 'none',
                  background: isEditing ? 'rgba(var(--c-neon-rgb), 0.03)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isEditing) (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--c-text-rgb), 0.02)' }}
                onMouseLeave={e => { if (!isEditing) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {/* Name col */}
                {isEditing ? (
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} autoFocus />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {c.parent_category_id && <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: 'rgba(var(--c-text-rgb), 0.3)' }}>subdirectory_arrow_right</span>}
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-text)' }}>{c.name}</p>
                      {c.parent_category_id && <p style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.35)', marginTop: '2px' }}>under {parentName(c.parent_category_id)}</p>}
                    </div>
                  </div>
                )}

                {/* Description col */}
                {isEditing ? (
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" style={inputStyle} />
                ) : (
                  <p style={{ fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', color: 'rgba(var(--c-text-rgb), 0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.description || <span style={{ color: 'rgba(var(--c-text-rgb), 0.2)', fontStyle: 'italic' }}>No description</span>}
                  </p>
                )}

                {/* Type / Parent col */}
                {isEditing ? (
                  <CustomSelect
                    value={editParent}
                    onChange={setEditParent}
                    options={categories.filter(x => x.managed && x.id !== c.id).map(x => ({ value: x.id, label: x.name }))}
                    placeholder="No parent"
                  />
                ) : c.managed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', width: 'fit-content',
                      background: c.parent_category_id ? 'rgba(99,102,241,0.10)' : 'rgba(var(--c-neon-rgb), 0.10)',
                      color: c.parent_category_id ? '#818cf8' : 'var(--c-neon)',
                      border: `1px solid ${c.parent_category_id ? 'rgba(99,102,241,0.25)' : 'rgba(var(--c-neon-rgb), 0.25)'}`,
                      fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>
                        {c.parent_category_id ? 'subdirectory_arrow_right' : 'folder'}
                      </span>
                      {c.parent_category_id ? 'Subcategory' : 'Main Category'}
                    </span>
                    {c.productCount > 0 && <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.3)' }}>{c.productCount} products</span>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', width: 'fit-content',
                      background: 'rgba(245,158,11,0.08)', color: '#f59e0b',
                      border: '1px solid rgba(245,158,11,0.20)',
                      fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>inventory_2</span>
                      Used by Products
                    </span>
                    <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.3)' }}>{c.productCount} products</span>
                  </div>
                )}

                {/* Actions col */}
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={cancelEdit} style={{ padding: '0.4rem 0.7rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid rgba(var(--c-text-rgb), 0.15)', color: 'rgba(var(--c-text-rgb), 0.45)', fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                      Cancel
                    </button>
                    <button onClick={() => handleSave(c.id)} disabled={saving}
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', background: saving ? 'rgba(var(--c-neon-rgb),0.4)' : 'var(--c-neon)', border: 'none', color: '#000', fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                      {saving ? '...' : 'Save'}
                    </button>
                  </div>
                ) : deleteId === c.id ? (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.62rem', color: '#ef4444', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>Sure?</span>
                    <button onClick={() => setDeleteId(null)} style={{ padding: '0.4rem 0.6rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid rgba(var(--c-text-rgb), 0.15)', color: 'rgba(var(--c-text-rgb), 0.45)', fontSize: '0.62rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                      No
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting}
                      style={{ padding: '0.4rem 0.7rem', borderRadius: '0.4rem', background: deleting ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: '0.62rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                      {deleting ? '...' : 'Yes'}
                    </button>
                  </div>
                ) : !c.managed ? (
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.2)' }}>—</span>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => { startEdit(c); setDeleteId(null) }}
                      style={{ padding: '0.35rem 0.65rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid rgba(var(--c-text-rgb), 0.12)', color: 'rgba(var(--c-text-rgb), 0.45)', fontSize: '0.62rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-neon)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-neon)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.45)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.82rem' }}>edit</span>
                      Edit
                    </button>
                    <button onClick={() => { setDeleteId(c.id); setEditId(null) }}
                      style={{ padding: '0.35rem 0.55rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.45)', fontSize: '0.62rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.45)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.82rem' }}>delete</span>
                    </button>
                  </div>
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
  )
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <section className="glass-panel rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center">
      <span className="material-symbols-outlined text-5xl mb-4" style={{ color: 'var(--c-neon)', opacity: 0.4 }}>
        {title === 'PRODUCTS' ? 'inventory_2' : title === 'STOCK' ? 'warehouse' : title === 'CATEGORIES' ? 'category' : 'local_shipping'}
      </span>
      <h2 className="text-2xl font-bold tracking-tight text-white/30 uppercase mb-2">{title}</h2>
      <p className="text-xs text-white/20 font-mono tracking-widest uppercase">Coming soon</p>
    </section>
  )
}

function DeliveriesView({ token }: { token: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DeliveryFilter>('ALL')
  const [search, setSearch] = useState('')
  const [completing, setCompleting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const fetchDeliveries = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = filter === 'COMPLETED' ? '?is_completed=true' : filter === 'PENDING' ? '?is_completed=false' : ''
      const res = await fetch(`${API}/deliveries${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDeliveries(data)
    } catch {
      setError('Failed to load deliveries.')
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => { fetchDeliveries() }, [fetchDeliveries])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleComplete = async (id: string) => {
    setCompleting(id)
    try {
      const res = await fetch(`${API}/deliveries/${id}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, is_completed: true } : d))
      showToast('Delivery marked as completed.', true)
    } catch {
      showToast('Failed to update delivery.', false)
    } finally {
      setCompleting(null)
    }
  }

  const filtered = deliveries.filter(d => {
    const matchSearch = (d.product_name || d.product_id).toLowerCase().includes(search.toLowerCase()) ||
      d.delivery_address.toLowerCase().includes(search.toLowerCase()) ||
      d.customer_id.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const pendingCount = deliveries.filter(d => !d.is_completed).length
  const completedCount = deliveries.filter(d => d.is_completed).length

  return (
    <div className="space-y-6">
      {/* Stats + Search */}
      <section className="glass-panel rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" style={{ fontSize: '1.1rem' }}>search</span>
          <input
            type="text"
            placeholder="Search by product, address or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs py-3 pl-10 pr-4 rounded-xl outline-none"
            style={{ background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.10)', color: 'var(--c-text)', fontFamily: 'Inter, sans-serif' }}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'COMPLETED'] as DeliveryFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
              style={{
                background: filter === f ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.04)',
                color: filter === f ? '#000' : 'rgba(var(--c-text-rgb), 0.45)',
                border: `1px solid ${filter === f ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.08)'}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-6 shrink-0">
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>{pendingCount}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--c-text-rgb), 0.4)' }}>Pending</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: 'var(--c-neon)' }}>{completedCount}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(var(--c-text-rgb), 0.4)' }}>Completed</p>
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(var(--c-neon-rgb),0.25)', borderTopColor: 'var(--c-neon)' }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <section className="glass-panel rounded-3xl border border-red-500/20 p-8 text-center">
          <p className="text-xs font-mono tracking-widest" style={{ color: '#ef4444' }}>{error}</p>
        </section>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr', gap: '1rem', padding: '1rem 2rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)', background: 'rgba(var(--c-text-rgb), 0.02)' }}>
            {['Product', 'Address', 'Qty', 'Total', 'Status', 'Action'].map(col => (
              <span key={col} style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>{col}</span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.75rem' }}>
              NO DELIVERIES FOUND
            </div>
          ) : (
            filtered.map((d, idx) => {
              const isCompleting = completing === d.id
              return (
                <div
                  key={d.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr', gap: '1rem',
                    padding: '1.1rem 2rem', alignItems: 'center',
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(var(--c-text-rgb), 0.05)' : 'none',
                    opacity: d.is_completed ? 0.6 : 1,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--c-text-rgb), 0.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  {/* Product */}
                  <div>
                    <p style={{ fontSize: '0.825rem', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-text)' }}>
                      {d.product_name || d.product_id}
                    </p>
                    {d.order_id && (
                      <p style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(var(--c-text-rgb), 0.35)', marginTop: '0.2rem' }}>
                        ORDER #{d.order_id.slice(-8).toUpperCase()}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <p style={{ fontSize: '0.72rem', fontFamily: 'Inter, sans-serif', color: 'rgba(var(--c-text-rgb), 0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.delivery_address}
                  </p>

                  {/* Qty */}
                  <p style={{ fontSize: '0.825rem', fontFamily: 'Space Grotesk, sans-serif', color: 'rgba(var(--c-text-rgb), 0.7)', fontWeight: 600 }}>
                    {String(d.quantity).padStart(2, '0')}
                  </p>

                  {/* Total */}
                  <p style={{ fontSize: '0.825rem', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-neon)', fontWeight: 600 }}>
                    ${d.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>

                  {/* Status */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.65rem', borderRadius: '9999px',
                    background: d.is_completed ? 'rgba(var(--c-neon-rgb), 0.10)' : 'rgba(245,158,11,0.10)',
                    color: d.is_completed ? 'var(--c-neon)' : '#f59e0b',
                    fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                    border: `1px solid ${d.is_completed ? 'rgba(var(--c-neon-rgb), 0.20)' : 'rgba(245,158,11,0.25)'}`,
                    width: 'fit-content',
                  }}>
                    {d.is_completed ? 'Delivered' : 'Pending'}
                  </span>

                  {/* Action */}
                  {!d.is_completed ? (
                    <button
                      onClick={() => handleComplete(d.id)}
                      disabled={isCompleting}
                      style={{
                        padding: '0.4rem 0.9rem', borderRadius: '0.5rem', border: '1px solid var(--c-neon)',
                        background: 'transparent', color: 'var(--c-neon)', fontSize: '0.65rem',
                        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.1em',
                        cursor: isCompleting ? 'not-allowed' : 'pointer', opacity: isCompleting ? 0.5 : 1,
                        textTransform: 'uppercase',
                      }}
                      onMouseEnter={e => { if (!isCompleting) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--c-neon-rgb), 0.10)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      {isCompleting ? '...' : 'Mark Done'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'rgba(var(--c-text-rgb), 0.25)', fontFamily: 'monospace' }}>—</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && deliveries.length === 0 && (
        <section className="glass-panel rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl mb-4" style={{ color: 'rgba(var(--c-text-rgb), 0.15)' }}>local_shipping</span>
          <p className="text-sm font-mono tracking-widest uppercase" style={{ color: 'rgba(var(--c-text-rgb), 0.3)' }}>No deliveries found</p>
        </section>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          padding: '0.875rem 1.5rem', borderRadius: '0.75rem',
          background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
          color: toast.ok ? '#22c55e' : '#ef4444',
          fontSize: '0.78rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 9999,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function ProductManagerDashboard() {
  const { user } = useAuth()
  const token = user?.token ?? ''

  const [activeTab, setActiveTab] = useState<TabType>('COMMENTS')
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('PENDING')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchReviews = useCallback(async (currentFilter: FilterType) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const statusParam = currentFilter === 'ALL' ? undefined : currentFilter.toLowerCase() as 'pending' | 'approved' | 'rejected'
      const data = await reviewService.getAllReviews(token, statusParam)
      setReviews(data)
    } catch {
      setError('Failed to load reviews. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeTab === 'COMMENTS') fetchReviews(filter)
  }, [activeTab, filter, fetchReviews])

  const handleStatusChange = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      setReviews(prev => prev.map(r => (r.id === id ? { ...r, status: status.toUpperCase() } : r)))
      try {
        await reviewService.updateReviewStatus(id, status, token)
      } catch {
        fetchReviews(filter)
      }
    },
    [token, fetchReviews, filter]
  )

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchesFilter = filter === 'ALL' || r.status.toUpperCase() === filter
      const matchesSearch =
        (r.product_name ?? r.product_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.username.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [reviews, filter, searchQuery])

  const pendingCount = reviews.filter(r => r.status.toUpperCase() === 'PENDING').length

  const TABS: TabType[] = ['COMMENTS', 'PRODUCTS', 'CATEGORIES', 'STOCK', 'DELIVERIES']

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1100px] space-y-8">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--c-neon)', opacity: 0.85 }}>
            Product Manager
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>Dashboard</h1>
          <p className="mt-2 text-sm text-white/55">
            Welcome back, {user?.first_name || user?.email}. Manage products, stock, and review moderation.
          </p>
        </section>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 glass-panel rounded-2xl border border-white/10">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-200"
              style={{
                background: activeTab === tab ? 'rgba(var(--c-neon-rgb), 0.12)' : 'transparent',
                color: activeTab === tab ? 'var(--c-neon)' : 'rgba(255,255,255,0.35)',
                border: activeTab === tab ? '1px solid rgba(var(--c-neon-rgb), 0.25)' : '1px solid transparent',
              }}
            >
              {tab}
              {tab === 'COMMENTS' && pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px]" style={{ background: 'rgba(var(--c-neon-rgb), 0.15)', color: 'var(--c-neon)' }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {activeTab === 'DELIVERIES' ? (
          <DeliveriesView token={token} />
        ) : activeTab === 'CATEGORIES' ? (
          <CategoriesView token={token} />
        ) : activeTab !== 'COMMENTS' ? (
          <PlaceholderView title={activeTab} />
        ) : (
          <>
            {/* Search & Filters */}
            <section className="glass-panel rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" style={{ fontSize: '1.1rem' }}>search</span>
                <input
                  type="text"
                  placeholder="Search by product or user..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs py-3 pl-10 pr-4 rounded-xl outline-none"
                  style={{ background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.10)', color: 'var(--c-text)', fontFamily: 'Inter, sans-serif' }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
                    style={{
                      background: filter === f ? 'var(--c-neon)' : 'rgba(255,255,255,0.03)',
                      color: filter === f ? '#000' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${filter === f ? 'var(--c-neon)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </section>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(var(--c-neon-rgb),0.25)', borderTopColor: 'var(--c-neon)' }} />
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <section className="glass-panel rounded-3xl border border-red-500/20 p-8 text-center">
                <p className="text-red-400 text-xs font-mono tracking-widest">{error}</p>
              </section>
            )}

            {/* Review cards */}
            {!loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredReviews.map(review => {
                  const status = review.status.toUpperCase()
                  const isPending = status === 'PENDING'
                  const isApproved = status === 'APPROVED'
                  return (
                    <div
                      key={review.id}
                      className="glass-panel rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200"
                      style={{
                        border: `1px solid ${isApproved ? 'rgba(var(--c-neon-rgb),0.20)' : status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.20)'}`,
                        opacity: status === 'REJECTED' ? 0.55 : 1,
                      }}
                      onMouseEnter={e => { if (status === 'REJECTED') (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                      onMouseLeave={e => { if (status === 'REJECTED') (e.currentTarget as HTMLDivElement).style.opacity = '0.55' }}
                    >
                      {/* Card header */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--c-neon)' }}>
                            {review.product_name ?? review.product_id}
                          </p>
                          <p className="text-[10px] uppercase" style={{ color: 'rgba(var(--c-text-rgb), 0.45)' }}>{review.username}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {!isPending && (
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: isApproved ? 'rgba(var(--c-neon-rgb),0.10)' : 'rgba(239,68,68,0.10)',
                                color: isApproved ? 'var(--c-neon)' : '#ef4444',
                                border: `1px solid ${isApproved ? 'rgba(var(--c-neon-rgb),0.20)' : 'rgba(239,68,68,0.20)'}`,
                              }}
                            >{status}</span>
                          )}
                          {isPending && (
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>PENDING</span>
                          )}
                          <StarRating rating={review.rating} />
                        </div>
                      </div>

                      {/* Comment */}
                      <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(var(--c-text-rgb), 0.75)' }}>{review.comment || <span style={{ fontStyle: 'italic', color: 'rgba(var(--c-text-rgb), 0.25)' }}>No comment.</span>}</p>

                      {/* Footer */}
                      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] font-mono" style={{ color: 'rgba(var(--c-text-rgb), 0.35)' }}>
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                        </p>
                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusChange(review.id, 'rejected')}
                              className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all"
                              style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', background: 'transparent' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                            >REJECT</button>
                            <button
                              onClick={() => handleStatusChange(review.id, 'approved')}
                              className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all"
                              style={{ color: '#000', background: 'var(--c-neon)', border: '1px solid var(--c-neon)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = '' }}
                            >APPROVE</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Refresh tile */}
                <button
                  onClick={() => fetchReviews(filter)}
                  className="glass-panel rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-200"
                  style={{ border: '1px dashed rgba(var(--c-text-rgb), 0.12)', opacity: 0.4, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.4' }}
                >
                  <span className="material-symbols-outlined text-4xl mb-3" style={{ color: 'var(--c-neon)' }}>refresh</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-neon)' }}>Refresh Queue</p>
                  <p className="text-[8px] mt-1" style={{ color: 'rgba(var(--c-text-rgb), 0.3)' }}>CLICK TO RELOAD</p>
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredReviews.length === 0 && (
              <section className="glass-panel rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl mb-4 text-white/15">rate_review</span>
                <p className="text-sm font-mono tracking-widest uppercase" style={{ color: 'rgba(var(--c-text-rgb), 0.3)' }}>No reviews found</p>
              </section>
            )}
          </>
        )}

      </div>
    </main>
  )
}
