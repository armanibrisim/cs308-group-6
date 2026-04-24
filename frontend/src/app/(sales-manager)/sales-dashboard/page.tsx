'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '../../../context/AuthContext'

const MODULES = [
  {
    href: '/sales-dashboard/invoices',
    title: 'Invoices & Analytics',
    description: 'View revenue, cost, profit summaries and browse all invoices. Filter by date range and export to CSV.',
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
    description: 'Apply or remove discount percentages on products. Wishlist owners are automatically notified.',
    icon: 'sell',
    accent: 'text-primary',
    border: 'hover:border-primary/40',
  },
  {
    href: '/sales-dashboard/promo-codes',
    title: 'Promo Codes',
    description: 'Create, manage, and deactivate promo codes. Customers can apply codes at checkout for a subtotal discount.',
    icon: 'confirmation_number',
    accent: 'text-violet-300',
    border: 'hover:border-violet-500/40',
  },
]

export default function SalesDashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'sales_manager' && user.role !== 'admin') router.replace('/browse')
  }, [user, isLoading, router])

  if (isLoading || !user || user.role !== 'sales_manager' && user.role !== 'admin') return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1100px] space-y-8">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            Sales Manager
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-white/55">
            Welcome back, {user.first_name || user.email}. Select a module to get started.
          </p>
        </section>

        {/* ── Module cards ── */}
        <section className="grid gap-5 sm:grid-cols-3">
          {MODULES.map(({ href, title, description, icon, accent, border }) => (
            <Link
              key={href}
              href={href}
              className={`glass-panel group flex flex-col gap-4 rounded-3xl border border-white/10 p-7 transition duration-200 ${border} hover:bg-white/[0.03]`}
            >
              <span className={`material-symbols-outlined text-4xl ${accent}`}>{icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{description}</p>
              </div>
              <span className={`mt-auto text-xs font-semibold uppercase tracking-widest ${accent} opacity-60 group-hover:opacity-100 transition`}>
                Open →
              </span>
            </Link>
          ))}
        </section>

      </div>
    </main>
  )
}
