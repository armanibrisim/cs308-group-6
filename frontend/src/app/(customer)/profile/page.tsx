'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import { Address, addressService } from '../../../services/addressService'

type KnownRole = 'customer' | 'sales_manager' | 'product_manager'

function normalizeRole(role: string): KnownRole | 'other' {
  if (role === 'customer' || role === 'sales_manager' || role === 'product_manager') return role
  return 'other'
}

const ROLE_BADGE: Record<KnownRole | 'other', string> = {
  customer: 'bg-sky-500/15 text-sky-300 border border-sky-500/35',
  sales_manager: 'bg-primary/15 text-primary border border-primary/40',
  product_manager: 'bg-violet-500/15 text-violet-300 border border-violet-500/35',
  other: 'bg-white/10 text-white/70 border border-white/20',
}

const ROLE_LABEL: Record<KnownRole | 'other', string> = {
  customer: 'Customer',
  sales_manager: 'Sales manager',
  product_manager: 'Product manager',
  other: 'User',
}

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const roleKey = useMemo(() => (user ? normalizeRole(user.role) : 'other'), [user])

  // ── Addresses ─────────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrError, setAddrError] = useState<string | null>(null)

  // New address form
  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newFull, setNewFull] = useState('')
  const [newDefault, setNewDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  // Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // ── Auth redirect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.replace(ROUTES.LOGIN)
  }, [user, isLoading, router])

  // ── Load addresses ────────────────────────────────────────────────────────
  const loadAddresses = useCallback(async () => {
    if (!user?.token) return
    setAddrLoading(true)
    setAddrError(null)
    try {
      const data = await addressService.getAddresses(user.token)
      setAddresses(data)
    } catch (err) {
      setAddrError(err instanceof Error ? err.message : 'Failed to load addresses.')
    } finally {
      setAddrLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    if (!isLoading && user) loadAddresses()
  }, [isLoading, user, loadAddresses])

  // ── Add address ───────────────────────────────────────────────────────────
  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.token) return
    if (!newLabel.trim() || !newFull.trim()) {
      setBanner({ type: 'error', msg: 'Label and address are required.' })
      return
    }
    setSaving(true)
    try {
      await addressService.addAddress(user.token, {
        label: newLabel.trim(),
        full_address: newFull.trim(),
        is_default: newDefault || addresses.length === 0,
      })
      setBanner({ type: 'success', msg: 'Address saved.' })
      setNewLabel('')
      setNewFull('')
      setNewDefault(false)
      setShowForm(false)
      await loadAddresses()
    } catch (err) {
      setBanner({ type: 'error', msg: err instanceof Error ? err.message : 'Failed to save address.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete address ────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!user?.token) return
    try {
      await addressService.deleteAddress(user.token, id)
      setAddresses(prev => prev.filter(a => a.id !== id))
      setBanner({ type: 'success', msg: 'Address removed.' })
    } catch (err) {
      setBanner({ type: 'error', msg: err instanceof Error ? err.message : 'Failed to delete.' })
    }
  }

  // ── Set default ───────────────────────────────────────────────────────────
  async function handleSetDefault(id: string) {
    if (!user?.token) return
    try {
      const updated = await addressService.setDefault(user.token, id)
      setAddresses(updated)
    } catch (err) {
      setBanner({ type: 'error', msg: err instanceof Error ? err.message : 'Failed to update.' })
    }
  }

  function handleLogout() {
    logout()
    router.replace(ROUTES.LOGIN)
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] px-6 py-16 text-white/60" aria-busy="true">
        <div className="mx-auto max-w-3xl">
          <div className="glass-panel animate-pulse rounded-3xl border border-white/10 p-8">
            <div className="h-8 w-48 rounded-lg bg-white/10" />
            <div className="mt-4 h-4 w-full max-w-md rounded bg-white/5" />
          </div>
        </div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-6 py-10 text-[#e5e2e1]">
      <div className="mx-auto max-w-3xl space-y-6">

        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">My account</h1>
        </header>

        {/* Banner */}
        {banner && (
          <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}>
            <span>{banner.msg}</span>
            <button type="button" onClick={() => setBanner(null)} className="shrink-0 text-white/60 hover:text-white">×</button>
          </div>
        )}

        {/* Account summary */}
        <section className="glass-panel rounded-3xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white">Account summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <dt className="text-white/50">Email</dt>
              <dd className="font-medium text-white">{user.email}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <dt className="text-white/50">Name</dt>
              <dd className="text-white">{user.first_name} {user.last_name}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-white/50">Role</dt>
              <dd>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[roleKey]}`}>
                  {ROLE_LABEL[roleKey]}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Quick actions */}
        <section className="glass-panel rounded-3xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white">Quick actions</h2>
          <nav className="mt-4 flex flex-wrap gap-3">
            <Link href={ROUTES.BROWSE} className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-primary/40 hover:text-primary">Browse</Link>
            <Link href={ROUTES.CART} className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-primary/40 hover:text-primary">Cart</Link>
            <Link href={ROUTES.ORDERS} className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-primary/40 hover:text-primary">Orders</Link>
            {roleKey === 'sales_manager' && (
              <Link href={ROUTES.SALES_DASHBOARD} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition hover:border-primary/50">Sales dashboard</Link>
            )}
            {roleKey === 'product_manager' && (
              <Link href={ROUTES.PRODUCT_DASHBOARD} className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition hover:border-violet-400/50">Product dashboard</Link>
            )}
          </nav>
        </section>

        {/* Delivery addresses */}
        <section className="glass-panel rounded-3xl border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Delivery addresses</h2>
              <p className="mt-0.5 text-xs text-white/45">Saved to your account — auto-filled at checkout.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(v => !v)}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50"
            >
              {showForm ? 'Cancel' : '+ Add address'}
            </button>
          </div>

          {/* Add address form */}
          {showForm && (
            <form onSubmit={handleAddAddress} className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-white/60">Label (e.g. Home, Work)</span>
                  <input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Home"
                    maxLength={50}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white outline-none transition focus:border-primary/40 placeholder:text-white/25"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-white/60 self-end pb-2">
                  <input
                    type="checkbox"
                    checked={newDefault}
                    onChange={e => setNewDefault(e.target.checked)}
                    className="accent-primary"
                  />
                  Set as default
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Full address</span>
                <textarea
                  value={newFull}
                  onChange={e => setNewFull(e.target.value)}
                  rows={3}
                  placeholder="Street, city, postal code, country"
                  maxLength={300}
                  className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white outline-none transition focus:border-primary/40 placeholder:text-white/25"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save address'}
              </button>
            </form>
          )}

          {/* Address list */}
          <div className="mt-5 space-y-3">
            {addrLoading ? (
              <p className="text-sm text-white/40">Loading addresses…</p>
            ) : addrError ? (
              <p className="text-sm text-rose-400">{addrError}</p>
            ) : addresses.length === 0 ? (
              <p className="text-sm text-white/40">No saved addresses yet.</p>
            ) : (
              addresses.map(addr => (
                <div key={addr.id} className={`rounded-2xl border p-4 transition ${addr.is_default ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-white/[0.02]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{addr.label}</span>
                      {addr.is_default && (
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!addr.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-xs text-white/50 transition hover:text-primary"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(addr.id)}
                        className="text-xs text-rose-400/70 transition hover:text-rose-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-white/60">{addr.full_address}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <Link href={ROUTES.HOME} className="text-sm text-white/50 transition hover:text-white">← Back to home</Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            Sign out
          </button>
        </div>

      </div>
    </main>
  )
}
