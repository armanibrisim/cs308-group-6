'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'

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

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [localBanner, setLocalBanner] = useState<string | null>(null)

  const roleKey = useMemo(() => (user ? normalizeRole(user.role) : 'other'), [user])

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(ROUTES.LOGIN)
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    setFirstName(user.first_name ?? '')
    setLastName(user.last_name ?? '')
  }, [user])

  function handleLogout() {
    logout()
    router.replace(ROUTES.LOGIN)
  }

  function handleSaveProfileLocal(e: React.FormEvent) {
    e.preventDefault()
    setLocalBanner('Profile details updated locally only — not saved to the server yet.')
  }

  function handleSaveAddressLocal(e: React.FormEvent) {
    e.preventDefault()
    setLocalBanner('Delivery address saved locally only — not synced to the server yet.')
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] px-6 py-16 text-white/60" aria-busy="true">
        <div className="mx-auto max-w-3xl">
          <div className="glass-panel animate-pulse rounded-3xl border border-white/10 p-8">
            <div className="h-8 w-48 rounded-lg bg-white/10" />
            <div className="mt-4 h-4 w-full max-w-md rounded bg-white/5" />
            <div className="mt-8 h-40 rounded-2xl bg-white/5" />
          </div>
          <p className="mt-6 text-center text-sm">Loading your account…</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] px-6 text-white/60">
        <p className="text-sm">Redirecting to sign in…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-6 py-10 text-[#e5e2e1]">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">My account</h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            View your LUMEN profile, jump to shopping tools, and manage session. Profile edits below stay in this
            browser until a backend profile API is connected.
          </p>
        </header>

        {localBanner ? (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
            role="status"
          >
            <span>{localBanner}</span>
            <button
              type="button"
              className="shrink-0 text-white/60 hover:text-white"
              aria-label="Dismiss notice"
              onClick={() => setLocalBanner(null)}
            >
              ×
            </button>
          </div>
        ) : null}

        <section className="glass-panel rounded-3xl border border-white/10 p-6" aria-labelledby="account-summary-heading">
          <h2 id="account-summary-heading" className="text-lg font-semibold text-white">
            Account summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <dt className="text-white/50">Email</dt>
              <dd className="font-medium text-white">{user.email}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <dt className="text-white/50">User ID</dt>
              <dd className="font-mono text-xs text-white/85">{user.doc_id}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-white/50">Role</dt>
              <dd>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[roleKey]}`}
                >
                  {ROLE_LABEL[roleKey]}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="glass-panel rounded-3xl border border-white/10 p-6" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="text-lg font-semibold text-white">
            Quick actions
          </h2>
          <nav className="mt-4 flex flex-wrap gap-3" aria-label="Shopping and account shortcuts">
            <Link
              href={ROUTES.BROWSE}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-primary/40 hover:text-primary"
            >
              Browse
            </Link>
            <Link
              href={ROUTES.CART}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-primary/40 hover:text-primary"
            >
              Cart
            </Link>
            <Link
              href={ROUTES.ORDERS}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-primary/40 hover:text-primary"
            >
              Orders
            </Link>
            {roleKey === 'sales_manager' ? (
              <Link
                href={ROUTES.SALES_DASHBOARD}
                className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition hover:border-primary/50"
              >
                Sales dashboard
              </Link>
            ) : null}
            {roleKey === 'product_manager' ? (
              <Link
                href={ROUTES.PRODUCT_DASHBOARD}
                className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition hover:border-violet-400/50"
              >
                Product dashboard
              </Link>
            ) : null}
          </nav>
        </section>

        <section className="glass-panel rounded-3xl border border-white/10 p-6" aria-labelledby="personal-heading">
          <h2 id="personal-heading" className="text-lg font-semibold text-white">
            Personal information
          </h2>
          <p className="mt-1 text-xs text-white/45">Edits below are kept in this session only — not sent to the server.</p>
          <form onSubmit={handleSaveProfileLocal} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">First name</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Last name</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                />
              </label>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Save locally
            </button>
          </form>
        </section>

        <section className="glass-panel rounded-3xl border border-white/10 p-6" aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="text-lg font-semibold text-white">
            Default delivery address
          </h2>
          <p className="mt-1 text-xs text-white/45">Optional — stored in this tab only until checkout / profile API ships.</p>
          <form onSubmit={handleSaveAddressLocal} className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Address</span>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={4}
                autoComplete="street-address"
                placeholder="Street, city, postal code…"
                className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white outline-none transition placeholder:text-white/25 focus:border-primary/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-primary/40 hover:text-primary"
            >
              Save address locally
            </button>
          </form>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <Link href={ROUTES.HOME} className="text-sm text-white/50 transition hover:text-white">
            ← Back to home
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
            aria-label="Sign out of your account"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
