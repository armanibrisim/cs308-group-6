'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../../context/AuthContext'
import { reviewService, Review } from '../../../services/reviewService'
import { AVAILABLE_ICONS, getCategoryIcon } from '../../../constants/categoryIcons'

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

// ── Product types ─────────────────────────────────────────────────────────────

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

const EMPTY_FORM = {
  name: '', model: '', serial_number: '', description: '',
  price: '', stock_quantity: '', warranty: '', distributor: '',
  category_id: '', image_url: '',
}

// ── Category types ────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  parent_category_id?: string | null
  icon?: string | null
  managed: boolean      // true = formal API kaydı var (edit/delete yapılabilir)
  productCount: number  // bu kategoriyi kullanan ürün sayısı
}

// ── Categories view ───────────────────────────────────────────────────────────

function calcPickerPos(btn: HTMLButtonElement): { top: number; left: number } {
  const rect = btn.getBoundingClientRect()
  const dropW = 270
  let left = rect.left
  if (left + dropW > window.innerWidth - 8) left = rect.right - dropW
  return { top: rect.bottom + 6, left: Math.max(8, left) }
}

function IconPickerDropdown({
  open,
  pos,
  selectedIcon,
  onSelect,
  onClose,
}: {
  open: boolean
  pos: { top: number; left: number }
  selectedIcon: string
  onSelect: (icon: string) => void
  onClose: () => void
}) {
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
        background: 'var(--c-surface, #1a1a1a)',
        border: '1px solid rgba(var(--c-neon-rgb),0.2)',
        borderRadius: '0.75rem', padding: '0.75rem', width: '270px',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      }}
    >
      {AVAILABLE_ICONS.map(({ icon, label }) => (
        <button
          key={icon}
          type="button"
          title={label}
          onClick={() => { onSelect(icon); onClose() }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
            padding: '0.45rem 0.25rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
            background: selectedIcon === icon ? 'rgba(var(--c-neon-rgb),0.15)' : 'rgba(var(--c-text-rgb),0.04)',
            outline: selectedIcon === icon ? '1px solid var(--c-neon)' : '1px solid transparent',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { if (selectedIcon !== icon) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--c-text-rgb),0.09)' }}
          onMouseLeave={e => { if (selectedIcon !== icon) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--c-text-rgb),0.04)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: selectedIcon === icon ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb),0.7)', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          <span style={{ fontSize: '0.42rem', color: 'rgba(var(--c-text-rgb),0.4)', fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
        </button>
      ))}
    </div>,
    document.body
  )
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
  const [newIcon, setNewIcon] = useState('')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [newIconPos, setNewIconPos] = useState({ top: 0, left: 0 })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Inline edit state: editId → { name, description, parent_category_id }
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editParent, setEditParent] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editIconPickerOpen, setEditIconPickerOpen] = useState(false)
  const [editIconPos, setEditIconPos] = useState({ top: 0, left: 0 })
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
        const prods: unknown[] = (prodsResult.value as { products?: unknown[] }).products ?? (prodsResult.value as unknown[]) ?? []
        for (const p of prods) {
          const pr = p as Record<string, unknown>
          const cat = (pr.category_id || pr.categoryId) as string | undefined
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
    if (newName.trim().length < 2) { setCreateError('Name must be at least 2 characters.'); return }
    setCreating(true); setCreateError(null)
    try {
      const body: Record<string, string> = { name: newName.trim() }
      if (newDesc.trim()) body.description = newDesc.trim()
      if (newParent) body.parent_category_id = newParent
      if (newIcon) body.icon = newIcon
      const res = await fetch(`${API}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail || 'Error') }
      const created: Category = { ...(await res.json()), managed: true, productCount: 0 }
      setCategories(prev => [...prev, created])
      setNewName(''); setNewDesc(''); setNewParent(''); setNewIcon(''); setIconPickerOpen(false)
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
    setEditId(c.id); setEditName(c.name); setEditDesc(c.description ?? ''); setEditParent(c.parent_category_id ?? ''); setEditIcon(c.icon ?? ''); setEditIconPickerOpen(false)
  }
  const cancelEdit = () => setEditId(null)

  const handleSave = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const body: Record<string, string> = { name: editName.trim() }
      if (editDesc.trim()) body.description = editDesc.trim()
      if (editParent) body.parent_category_id = editParent
      if (editIcon) body.icon = editIcon
      const res = await fetch(`${API}/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const raw = await res.json()
      const updated: Category = { ...raw, managed: true, productCount: categories.find(c => c.id === id)?.productCount ?? 0 }
      setCategories(prev => prev.map(c => c.id === id ? updated : c))
      setEditId(null); setEditIconPickerOpen(false)
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr auto auto', gap: '0.75rem', alignItems: 'start' }}>
            <div>
              <input
                type="text" value={newName} onChange={e => setNewName(e.target.value.slice(0, 50))}
                placeholder="Category name *"
                maxLength={50}
                style={{ ...inputStyle, borderColor: createError && !newName.trim() ? 'rgba(239,68,68,0.5)' : 'rgba(var(--c-text-rgb), 0.15)' }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                {createError && !newName.trim()
                  ? <span style={{ fontSize: '0.6rem', color: '#ef4444', fontFamily: 'monospace' }}>Name is required</span>
                  : <span />
                }
                <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: newName.length >= 45 ? '#f59e0b' : 'rgba(var(--c-text-rgb), 0.25)' }}>
                  {newName.length}/50
                </span>
              </div>
            </div>
            <div>
              <input
                type="text" value={newDesc} onChange={e => setNewDesc(e.target.value.slice(0, 200))}
                placeholder="Description (optional)"
                maxLength={200}
                style={inputStyle}
              />
              <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: newDesc.length >= 180 ? '#f59e0b' : 'rgba(var(--c-text-rgb), 0.25)' }}>
                  {newDesc.length}/200
                </span>
              </div>
            </div>
            <CustomSelect
              value={newParent}
              onChange={setNewParent}
              options={categories.filter(c => c.managed).map(c => ({ value: c.id, label: c.name }))}
              placeholder="No parent"
            />
            {/* ── Icon picker button ── */}
            <div>
              <button
                type="button"
                onClick={e => {
                  setNewIconPos(calcPickerPos(e.currentTarget))
                  setIconPickerOpen(o => !o)
                }}
                title="Select icon"
                style={{
                  ...inputStyle, width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  cursor: 'pointer', whiteSpace: 'nowrap', padding: '0.55rem 0.75rem',
                  borderColor: iconPickerOpen ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.15)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: newIcon ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb),0.4)', fontVariationSettings: "'FILL' 1" }}>
                  {newIcon || getCategoryIcon(newName)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(var(--c-text-rgb),0.5)' }}>Icon</span>
                <span className="material-symbols-outlined" style={{ fontSize: '0.85rem', color: 'rgba(var(--c-text-rgb),0.3)' }}>expand_more</span>
              </button>
              <IconPickerDropdown
                open={iconPickerOpen}
                pos={newIconPos}
                selectedIcon={newIcon}
                onSelect={setNewIcon}
                onClose={() => setIconPickerOpen(false)}
              />
            </div>
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
                  display: 'grid', gridTemplateColumns: isEditing ? '2fr 2fr 1fr auto 140px' : '2fr 2fr 1fr 140px', gap: '1rem',
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
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--c-neon)', fontVariationSettings: "'FILL' 1", opacity: 0.8, flexShrink: 0 }}>
                      {getCategoryIcon(c.id, c.icon)}
                    </span>
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

                {/* Icon picker col — only visible when editing */}
                {isEditing && (
                  <div>
                    <button
                      type="button"
                      onClick={e => {
                        setEditIconPos(calcPickerPos(e.currentTarget))
                        setEditIconPickerOpen(o => !o)
                      }}
                      title="Select icon"
                      style={{
                        ...inputStyle, width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem',
                        cursor: 'pointer', padding: '0.55rem 0.75rem',
                        borderColor: editIconPickerOpen ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.15)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--c-neon)', fontVariationSettings: "'FILL' 1" }}>
                        {editIcon || getCategoryIcon(c.id, c.icon)}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.85rem', color: 'rgba(var(--c-text-rgb),0.3)' }}>expand_more</span>
                    </button>
                    <IconPickerDropdown
                      open={editIconPickerOpen}
                      pos={editIconPos}
                      selectedIcon={editIcon}
                      onSelect={setEditIcon}
                      onClose={() => setEditIconPickerOpen(false)}
                    />
                  </div>
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

// ── Products view ─────────────────────────────────────────────────────────────

function ProductsView({ token }: { token: string }) {
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

  return (
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
                  <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>Pricing & Inventory</span>
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
                    <CustomSelect value={form.category_id} onChange={v => setField('category_id', v)} options={catList.map(c => ({ value: c.id, label: c.name }))} placeholder="Select" />
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
        ) : activeTab === 'PRODUCTS' ? (
          <ProductsView token={token} />
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
