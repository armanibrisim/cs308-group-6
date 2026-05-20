'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '../../../context/AuthContext'

const MODULES = [
  {
    href: '/products-dashboard/reviews',
    title: 'Comments & Reviews',
    description: 'Moderate customer reviews. Approve or reject pending submissions to keep content quality high.',
    icon: 'rate_review',
    accent: 'text-primary',
    border: 'hover:border-primary/40',
  },
  {
    href: '/products-dashboard/products',
    title: 'Products',
    description: 'Add, edit, and delete products. Manage pricing, stock, descriptions, and category assignments.',
    icon: 'inventory_2',
    accent: 'text-sky-300',
    border: 'hover:border-sky-500/40',
  },
  {
    href: '/products-dashboard/categories',
    title: 'Categories',
    description: 'Create and manage product categories. Set icons, descriptions, and parent-child relationships.',
    icon: 'category',
    accent: 'text-violet-300',
    border: 'hover:border-violet-500/40',
  },
  {
    href: '/products-dashboard/stock',
    title: 'Stock Management',
    description: 'Monitor and update product stock levels. Keep inventory accurate and catch low-stock items early.',
    icon: 'package_2',
    accent: 'text-emerald-300',
    border: 'hover:border-emerald-500/40',
  },
  {
    href: '/products-dashboard/deliveries',
    title: 'Deliveries',
    description: 'View and manage all customer orders. Update delivery status and track shipments.',
    icon: 'local_shipping',
    accent: 'text-orange-300',
    border: 'hover:border-orange-500/40',
  },
]

export default function ProductManagerDashboard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'product_manager' && user.role !== 'admin') router.replace('/browse')
  }, [user, isLoading, router])

  if (isLoading || !user || (user.role !== 'product_manager' && user.role !== 'admin')) return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-8">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            Product Manager
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
