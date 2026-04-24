'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../context/AuthContext'
import { PromoCode, promoCodeService } from '../../../../services/checkoutService'

// ── Style helpers ──────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.75rem',
  padding: '0.85rem 1rem',
  fontSize: '13px',
  fontFamily: 'monospace',
  color: '#fff',
  outline: 'none',
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: '0.4rem',
}

function statusPill(code: PromoCode) {
  if (!code.is_active)
    return { label: 'Inactive', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
  if (code.expires_at && new Date(code.expires_at) < new Date())
    return { label: 'Expired', bg: 'rgba(234,179,8,0.15)', color: '#eab308' }
  return { label: 'Active', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PromoCodesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [codes, setCodes] = useState<PromoCode[]>([])
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [formCode, setFormCode] = useState('')
  const [formDiscount, setFormDiscount] = useState('')
  const [formMaxUses, setFormMaxUses] = useState('')
  const [formExpiry, setFormExpiry] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  // Auth guard
  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'sales_manager' && user.role !== 'admin') router.replace('/browse')
  }, [user, isLoading, router])

  // Load codes
  const loadCodes = async () => {
    if (!user?.token) return
    setFetching(true)
    setFetchError(null)
    try {
      const data = await promoCodeService.list(user.token)
      setCodes(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load promo codes.')
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'sales_manager' || user?.role === 'admin') loadCodes()
  }, [user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formCode.trim() || !formDiscount) {
      setFormError('Code and discount are required.')
      return
    }
    setFormSaving(true)
    setFormError(null)
    try {
      // Convert plain date (YYYY-MM-DD) → end-of-day ISO string for the backend
      const expiresIso = formExpiry ? `${formExpiry}T23:59:59Z` : undefined
      const created = await promoCodeService.create(user!.token, {
        code: formCode.trim().toUpperCase(),
        discount_percent: parseFloat(formDiscount),
        max_uses: formMaxUses ? parseInt(formMaxUses) : undefined,
        expires_at: expiresIso,
        is_active: formActive,
      })
      setCodes(prev => [created, ...prev])
      setShowForm(false)
      setFormCode('')
      setFormDiscount('')
      setFormMaxUses('')
      setFormExpiry('')
      setFormActive(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create code.')
    } finally {
      setFormSaving(false)
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const updated = await promoCodeService.deactivate(user!.token, id)
      setCodes(prev => prev.map(c => (c.id === id ? updated : c)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate.')
    }
  }

  async function handleReactivate(id: string) {
    try {
      const updated = await promoCodeService.update(user!.token, id, { is_active: true })
      setCodes(prev => prev.map(c => (c.id === id ? updated : c)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate.')
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return
    try {
      await promoCodeService.delete(user!.token, id)
      setCodes(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete.')
    }
  }

  if (isLoading || !user || user.role !== 'sales_manager' && user.role !== 'admin') return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1100px] space-y-6">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Sales Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Promo Codes</h1>
              <p className="mt-2 text-sm text-white/60">Create and manage promotional discount codes for customers.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/sales-dashboard"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-primary/40 hover:text-primary"
              >
                ← Back to Dashboard
              </Link>
              <button
                onClick={() => setShowForm(v => !v)}
                style={{
                  background: showForm ? 'rgba(255,255,255,0.06)' : 'var(--c-neon, #39ff14)',
                  color: showForm ? 'rgba(255,255,255,0.5)' : '#022100',
                  border: 'none',
                  borderRadius: '0.75rem',
                  padding: '0.85rem 1.5rem',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{showForm ? 'close' : 'add'}</span>
                {showForm ? 'Cancel' : 'New Code'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Create Form ── */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.5rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <p style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>Create New Promo Code</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={LABEL}>Code *</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER25"
                  maxLength={32}
                  required
                  style={INPUT}
                />
              </div>
              <div>
                <label style={LABEL}>Discount % *</label>
                <input
                  type="number"
                  value={formDiscount}
                  onChange={e => setFormDiscount(e.target.value)}
                  placeholder="e.g. 20"
                  min={1}
                  max={100}
                  step={0.1}
                  required
                  style={INPUT}
                />
              </div>
              <div>
                <label style={LABEL}>Max Uses (leave blank = unlimited)</label>
                <input
                  type="number"
                  value={formMaxUses}
                  onChange={e => setFormMaxUses(e.target.value)}
                  placeholder="e.g. 100"
                  min={1}
                  style={INPUT}
                />
              </div>
              <div>
                <label style={LABEL}>Expires At (optional)</label>
                <input
                  type="date"
                  value={formExpiry}
                  onChange={e => setFormExpiry(e.target.value)}
                  style={{ ...INPUT, colorScheme: 'dark' }}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formActive}
                onChange={e => setFormActive(e.target.checked)}
                style={{ accentColor: 'var(--c-neon, #39ff14)', width: '14px', height: '14px' }}
              />
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active immediately</span>
            </label>

            {formError && (
              <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ef4444' }}>{formError}</p>
            )}

            <button
              type="submit"
              disabled={formSaving}
              style={{
                alignSelf: 'flex-start',
                background: formSaving ? 'rgba(255,255,255,0.1)' : 'var(--c-neon, #39ff14)',
                color: '#022100',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.85rem 2rem',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: formSaving ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {formSaving ? 'Creating…' : 'Create Code'}
            </button>
          </form>
        )}

        {/* ── Table ── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1.5rem', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Code', 'Discount', 'Uses', 'Max Uses', 'Expires', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                      Loading…
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', fontSize: '12px', fontFamily: 'monospace', color: '#ef4444' }}>
                      {fetchError}
                    </td>
                  </tr>
                ) : codes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                      No promo codes yet. Create one above.
                    </td>
                  </tr>
                ) : codes.map((code, i) => {
                  const pill = statusPill(code)
                  return (
                    <tr
                      key={code.id}
                      style={{ borderBottom: i < codes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'var(--c-neon, #39ff14)', letterSpacing: '0.05em' }}>
                        {code.code}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '13px', color: '#fff' }}>
                        {code.discount_percent}%
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        {code.uses}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        {code.max_uses ?? '∞'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.3rem 0.75rem', borderRadius: '2rem', background: pill.bg, color: pill.color, fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {pill.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {code.is_active ? (
                            <button
                              onClick={() => handleDeactivate(code.id)}
                              title="Deactivate"
                              style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '0.5rem', padding: '0.4rem 0.7rem', color: '#eab308', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.15s' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>pause</span>
                              Pause
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(code.id)}
                              title="Reactivate"
                              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.4rem 0.7rem', color: '#22c55e', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.15s' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>play_arrow</span>
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(code.id, code.code)}
                            title="Delete"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', padding: '0.4rem 0.7rem', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.15s' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}
