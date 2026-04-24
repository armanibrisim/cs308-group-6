'use client'

import Link from 'next/link'
import { useAuth } from '../../../context/AuthContext'

const MODULES = [
  {
    href: '/admin-dashboard/users',
    title: 'User Management',
    description: 'View all registered users, search by email or name, and change their role (customer, sales manager, product manager, admin).',
    icon: 'manage_accounts',
    accent: '#f87171',
    border: 'hover:border-red-500/40',
  },
  {
    href: '/sales-dashboard',
    title: 'Sales Dashboard',
    description: 'Access invoices, analytics, all orders, product discounts, and promo code management.',
    icon: 'receipt_long',
    accent: '#34d399',
    border: 'hover:border-emerald-500/40',
  },
  {
    href: '/products-dashboard',
    title: 'Product Dashboard',
    description: 'Manage the product catalogue, add new items, update pricing and stock levels.',
    icon: 'inventory_2',
    accent: '#818cf8',
    border: 'hover:border-violet-500/40',
  },
]

export default function AdminDashboardPage() {
  const { user } = useAuth()

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1100px] space-y-8">

        {/* ── Header ── */}
        <section className="glass-panel rounded-3xl border border-white/10 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: '#ef4444', opacity: 0.85 }}>
            System Admin
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-white/55">
            Welcome, {user?.first_name || user?.email}. Full system access enabled.
          </p>
        </section>

        {/* ── Module Cards ── */}
        <section className="grid gap-5 sm:grid-cols-3">
          {MODULES.map(({ href, title, description, icon, accent, border }) => (
            <Link
              key={href}
              href={href}
              className={`glass-panel group flex flex-col gap-4 rounded-3xl border border-white/10 p-7 transition duration-200 ${border} hover:bg-white/[0.03]`}
            >
              <span className="material-symbols-outlined text-4xl" style={{ color: accent }}>{icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{description}</p>
              </div>
              <span className="mt-auto text-xs font-semibold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition" style={{ color: accent }}>
                Open →
              </span>
            </Link>
          ))}
        </section>

      </div>
    </main>
  )
}
