'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '../../../../context/AuthContext'

export default function StockPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user || (user.role !== 'product_manager' && user.role !== 'admin')) router.replace('/login')
  }, [user, isLoading, router])

  if (isLoading || !user || (user.role !== 'product_manager' && user.role !== 'admin')) return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Product Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Stock Management</h1>
              <p className="mt-2 text-sm text-white/60">
                Monitor and update product stock levels. Keep inventory accurate and catch low-stock items early.
              </p>
            </div>
            <Link
              href="/products-dashboard"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-primary/40 hover:text-primary"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </section>

        {/* ── Placeholder ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-5xl text-white/20 mb-4">package_2</span>
          <p className="text-white/40 text-sm">Stock management coming soon.</p>
        </section>

      </div>
    </main>
  )
}
