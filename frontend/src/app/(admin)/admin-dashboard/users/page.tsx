'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../context/AuthContext'
import { ROLE_META } from '../../../../constants/roleColors'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

const ROLES = ['customer', 'sales_manager', 'product_manager', 'admin'] as const
type Role = typeof ROLES[number]

interface UserRow {
  id: string
  email: string
  first_name: string
  last_name: string
  role: Role
  created_at: string
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!user?.token) return
    fetch(`${API}/admin/users`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setError('Failed to load users.'); setLoading(false) })
  }, [user?.token])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (!user?.token) return
    setUpdating(userId)
    try {
      const res = await fetch(`${API}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error()
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showToast('Role updated successfully.', true)
    } catch {
      showToast('Failed to update role.', false)
    } finally {
      setUpdating(null)
    }
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1100px] space-y-6">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <button
            onClick={() => router.push('/admin-dashboard')}
            style={{ background: 'none', border: '1px solid rgba(var(--c-text-rgb), 0.12)', borderRadius: '50%', width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(var(--c-text-rgb), 0.5)', flexShrink: 0, transition: 'border-color 0.2s, color 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.5)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
          </button>
          <div>
            <p style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.2rem' }}>Admin</p>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--c-text)' }}>User Management</h1>
          </div>
        </div>

        {/* ── Search + Stats ── */}
        <div className="grounded-box" style={{ borderRadius: '1.25rem', padding: '1.5rem 2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: 'rgba(var(--c-text-rgb), 0.35)', pointerEvents: 'none' }}>search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', paddingLeft: '2.75rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem',
                background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.10)',
                borderRadius: '0.75rem', color: 'var(--c-text)', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {ROLES.map(role => {
              const count = users.filter(u => u.role === role).length
              const meta = ROLE_META[role]
              return (
                <div key={role} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.25rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: meta.color }}>{count}</p>
                  <p style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>{meta.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="grounded-box" style={{ borderRadius: '1.25rem', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '1rem', padding: '1rem 2rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.07)', background: 'rgba(var(--c-text-rgb), 0.02)' }}>
            {['User', 'Email', 'Role', 'Change Role'].map(col => (
              <span key={col} style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(var(--c-text-rgb), 0.4)' }}>{col}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.75rem' }}>
              LOADING USERS...
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.75rem' }}>
              NO USERS FOUND
            </div>
          ) : (
            filtered.map((u, idx) => {
              const meta = ROLE_META[u.role]
              const isUpdating = updating === u.id
              const isSelf = u.id === user?.doc_id || u.email === user?.email
              return (
                <div
                  key={u.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '1rem',
                    padding: '1.1rem 2rem', alignItems: 'center',
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(var(--c-text-rgb), 0.05)' : 'none',
                    background: isSelf ? 'rgba(239,68,68,0.02)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelf) (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--c-text-rgb), 0.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelf ? 'rgba(239,68,68,0.02)' : 'transparent' }}
                >
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: isSelf ? 'rgba(239,68,68,0.12)' : 'rgba(var(--c-text-rgb), 0.06)', border: `1px solid ${isSelf ? 'rgba(239,68,68,0.25)' : 'rgba(var(--c-text-rgb), 0.10)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: isSelf ? '#ef4444' : 'rgba(var(--c-text-rgb), 0.5)' }}>
                        {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                        {isSelf && <span style={{ marginLeft: '0.5rem', fontSize: '0.55rem', color: '#ef4444', letterSpacing: '0.15em' }}>YOU</span>}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <p style={{ fontSize: '0.78rem', fontFamily: 'Inter, sans-serif', color: 'rgba(var(--c-text-rgb), 0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email}
                  </p>

                  {/* Role badge */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.65rem', borderRadius: '9999px', background: meta.bg, color: meta.color, fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', width: 'fit-content' }}>
                    {meta.label}
                  </span>

                  {/* Role selector */}
                  {isSelf ? (
                    <span style={{ fontSize: '0.65rem', color: 'rgba(var(--c-text-rgb), 0.25)', fontFamily: 'monospace' }}>—</span>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={u.role}
                        disabled={isUpdating}
                        onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                        style={{
                          appearance: 'none', width: '100%', padding: '0.5rem 2rem 0.5rem 0.75rem',
                          background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.12)',
                          borderRadius: '0.5rem', color: 'var(--c-text)', fontSize: '0.75rem',
                          fontFamily: 'Space Grotesk, sans-serif', cursor: isUpdating ? 'not-allowed' : 'pointer',
                          outline: 'none', opacity: isUpdating ? 0.5 : 1,
                        }}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_META[r].label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: 'rgba(var(--c-text-rgb), 0.4)', pointerEvents: 'none' }}>
                        {isUpdating ? 'progress_activity' : 'unfold_more'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            padding: '0.875rem 1.5rem', borderRadius: '0.75rem',
            background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
            color: toast.ok ? '#22c55e' : '#ef4444',
            fontSize: '0.78rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 9999,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
            {toast.msg}
          </div>
        )}

      </div>
    </main>
  )
}
