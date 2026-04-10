'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '../../../context/AuthContext'

const MODULES = [
  {
    href: '/sales-dashboard/invoices',
    title: 'Invoices & Analytics',
    description:
      'View revenue, cost, profit summaries and browse all invoices. Filter by date range and export to CSV.',
    icon: 'receipt_long',
    accent: 'text-emerald-300',
    border: 'hover:border-emerald-500/40',
  },
  {
    href: '/sales-dashboard/orders',
    title: 'All Orders',
    description: 'Browse every customer order, filter by status, and drill down into line items.',
    icon: 'package_2',
    accent: 'text-sky-300',
    border: 'hover:border-sky-500/40',
  },
  {
    href: '/sales-dashboard/discounts',
    title: 'Product Discounts',
    description:
      'Apply or remove discount percentages on products. Wishlist owners are automatically notified.',
    icon: 'sell',
    accent: 'text-primary',
    border: 'hover:border-primary/40',
  },
] as const

export default function SalesManagerDashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'sales_manager') router.replace('/browse')
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <main className="min-h-screen px-8 py-10 text-white/60 font-sans">Loading…</main>
    )
  }
  if (!user || user.role !== 'sales_manager') return null

  return (
    <main className="min-h-screen px-8 py-10 text-white font-sans">
      <div className="mx-auto w-full max-w-[1200px] space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Sales Manager</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Choose a module to manage pricing, orders, and invoices.
          </p>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className={`group glass-panel flex flex-col rounded-3xl border border-white/10 p-7 transition hover:border-white/20 ${module.border}`}
            >
              <span
                className={`material-symbols-outlined text-3xl ${module.accent}`}
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                {module.icon}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-white">{module.title}</h2>
              <p className="mt-2 flex-1 text-sm text-white/55 leading-relaxed">{module.description}</p>
              <span
                className={`mt-4 text-xs font-semibold uppercase tracking-widest ${module.accent} opacity-60 group-hover:opacity-100 transition`}
              >
                Open →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
