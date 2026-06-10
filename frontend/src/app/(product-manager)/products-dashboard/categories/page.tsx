'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { DashboardPageHeader, PRODUCT_MANAGER_HEADER } from '../../../../components/dashboard/DashboardPageHeader'
import { useAuth } from '../../../../context/AuthContext'
import { AVAILABLE_ICONS, getCategoryIcon } from '../../../../constants/categoryIcons'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

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

function calcPickerPos(btn: HTMLButtonElement): { top: number; left: number; openUp: boolean } {
  const rect = btn.getBoundingClientRect()
  const dropW = 300
  const dropH = 320
  let left = rect.left
  if (left + dropW > window.innerWidth - 8) left = rect.right - dropW
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const openUp = spaceBelow < dropH && rect.top > dropH
  const top = openUp ? rect.top - dropH - 6 : rect.bottom + 6
  return { top, left: Math.max(8, left), openUp }
}

function IconPickerDropdown({
  open,
  pos,
  selectedIcon,
  onSelect,
  onClose,
}: {
  open: boolean
  pos: { top: number; left: number; openUp?: boolean }
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
        background: 'var(--c-surface, #111)',
        border: '1px solid rgba(var(--c-neon-rgb),0.2)',
        borderRadius: '0.75rem', padding: '0.75rem', width: '300px',
        boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
        maxHeight: '320px', overflowY: 'auto',
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.3rem',
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

export default function CategoriesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const token = user?.token ?? ''

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

  // Inline edit state
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

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'product_manager' && user.role !== 'admin') router.replace('/browse')
  }, [user, isLoading, router])

  const fetchCategories = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [apiResult, prodsResult] = await Promise.allSettled([
        fetch(`${API}/categories`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch(`${API}/products?limit=500&page=1`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
      ])

      const counts: Record<string, number> = {}
      if (prodsResult.status === 'fulfilled') {
        const prods: unknown[] = (prodsResult.value as { products?: unknown[] }).products ?? (prodsResult.value as unknown[]) ?? []
        for (const p of prods) {
          const pr = p as Record<string, unknown>
          const cat = (pr.category_id || pr.categoryId) as string | undefined
          if (cat) counts[cat] = (counts[cat] || 0) + 1
        }
      }

      const apiCats: Category[] = []
      const apiIds = new Set<string>()
      if (apiResult.status === 'fulfilled' && Array.isArray(apiResult.value)) {
        for (const c of apiResult.value) {
          apiCats.push({ ...c, managed: true, productCount: counts[c.id] ?? 0 })
          apiIds.add(c.id)
        }
      }

      const derivedCats: Category[] = Object.entries(counts)
        .filter(([id]) => !apiIds.has(id))
        .map(([id, count]) => ({
          id,
          name: id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          managed: false,
          productCount: count,
        }))

      const flat = [...apiCats, ...derivedCats]
      const mainSorted = flat.filter(c => !c.parent_category_id).sort((a, b) => b.productCount - a.productCount)
      const subMap: Record<string, Category[]> = {}
      for (const c of flat) {
        if (c.parent_category_id) {
          if (!subMap[c.parent_category_id]) subMap[c.parent_category_id] = []
          subMap[c.parent_category_id].push(c)
        }
      }
      const ordered: Category[] = []
      for (const main of mainSorted) {
        ordered.push(main)
        if (subMap[main.id]) ordered.push(...subMap[main.id].sort((a, b) => a.name.localeCompare(b.name)))
      }
      for (const c of flat) {
        if (c.parent_category_id && !ordered.find(o => o.id === c.id)) ordered.push(c)
      }
      setCategories(ordered)
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

  if (isLoading || !user || (user.role !== 'product_manager' && user.role !== 'admin')) return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        <DashboardPageHeader
          {...PRODUCT_MANAGER_HEADER}
          title="Categories"
        />

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
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
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
                        options={categories.filter(x => x.id !== c.id).map(x => ({ value: x.id, label: x.name }))}
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

      </div>
    </main>
  )
}
