'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../../context/AuthContext'

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface SalesOrder {
  id: string
  customer: string
  email: string
  itemCount: number
  amount: number
  status: OrderStatus
  placedAt: string
  notes?: string
}

interface OrderFormState {
  customer: string
  email: string
  itemCount: string
  amount: string
  status: OrderStatus
  placedAt: string
  notes: string
}

type FormErrors = Partial<Record<keyof OrderFormState, string>>

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
  processing: 'bg-sky-500/10 text-sky-300 border border-sky-500/30',
  shipped: 'bg-violet-500/10 text-violet-300 border border-violet-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  cancelled: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
}

const INITIAL_ORDERS: SalesOrder[] = [
  {
    id: 'ORD-29014',
    customer: 'Arda Demir',
    email: 'arda@example.com',
    itemCount: 3,
    amount: 1249,
    status: 'delivered',
    placedAt: '2026-03-25',
  },
  {
    id: 'ORD-29010',
    customer: 'Elif Yaman',
    email: 'elif@example.com',
    itemCount: 1,
    amount: 379.99,
    status: 'processing',
    placedAt: '2026-03-25',
  },
  {
    id: 'ORD-29002',
    customer: 'Mert Aksoy',
    email: 'mert@example.com',
    itemCount: 2,
    amount: 2149.5,
    status: 'shipped',
    placedAt: '2026-03-24',
  },
  {
    id: 'ORD-28995',
    customer: 'Selin Kaya',
    email: 'selin@example.com',
    itemCount: 1,
    amount: 129.9,
    status: 'cancelled',
    placedAt: '2026-03-24',
  },
  {
    id: 'ORD-28990',
    customer: 'Burak Acar',
    email: 'burak@example.com',
    itemCount: 4,
    amount: 849,
    status: 'pending',
    placedAt: '2026-03-23',
  },
]

function emptyForm(): OrderFormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    customer: '',
    email: '',
    itemCount: '1',
    amount: '',
    status: 'pending',
    placedAt: today,
    notes: '',
  }
}

function toForm(order: SalesOrder): OrderFormState {
  return {
    customer: order.customer,
    email: order.email,
    itemCount: String(order.itemCount),
    amount: String(order.amount),
    status: order.status,
    placedAt: order.placedAt,
    notes: order.notes ?? '',
  }
}

function nextOrderId(existing: SalesOrder[]): string {
  const nums = existing
    .map((o) => {
      const m = /^ORD-(\d+)$/i.exec(o.id)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const max = nums.length ? Math.max(...nums) : 28999
  return `ORD-${max + 1}`
}

export default function SalesManagerOrdersPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [orders, setOrders] = useState<SalesOrder[]>(INITIAL_ORDERS)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<OrderFormState>(() => emptyForm())
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== 'sales_manager') router.replace('/login')
  }, [isLoading, router, user])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return orders.filter((o) => {
      const matchQ =
        q.length === 0 ||
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
      const matchS = statusFilter === 'all' || o.status === statusFilter
      return matchQ && matchS
    })
  }, [orders, searchTerm, statusFilter])

  function openCreate() {
    setEditingId(null)
    setFormErrors({})
    setFormState(emptyForm())
    setModalOpen(true)
  }

  function openEdit(order: SalesOrder) {
    setEditingId(order.id)
    setFormErrors({})
    setFormState(toForm(order))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setFormErrors({})
  }

  function validate(): { ok: boolean; parsed?: { itemCount: number; amount: number } } {
    const errors: FormErrors = {}
    if (!formState.customer.trim()) errors.customer = 'Customer name is required.'
    const email = formState.email.trim()
    if (!email) errors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.'
    const itemCount = parseInt(formState.itemCount, 10)
    if (!Number.isFinite(itemCount) || itemCount < 1) errors.itemCount = 'Item count must be at least 1.'
    const amount = Number(formState.amount)
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than 0.'
    if (!formState.placedAt) errors.placedAt = 'Date is required.'

    setFormErrors(errors)
    if (Object.keys(errors).length) return { ok: false }
    return { ok: true, parsed: { itemCount, amount } }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    if (!v.ok || !v.parsed) {
      setBanner({ type: 'error', message: 'Please fix the form errors.' })
      return
    }

    if (editingId) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingId
            ? {
                ...o,
                customer: formState.customer.trim(),
                email: formState.email.trim(),
                itemCount: v.parsed!.itemCount,
                amount: v.parsed!.amount,
                status: formState.status,
                placedAt: formState.placedAt,
                notes: formState.notes.trim() || undefined,
              }
            : o
        )
      )
      setBanner({ type: 'success', message: `${editingId} updated.` })
    } else {
      const id = nextOrderId(orders)
      setOrders((prev) => [
        {
          id,
          customer: formState.customer.trim(),
          email: formState.email.trim(),
          itemCount: v.parsed!.itemCount,
          amount: v.parsed!.amount,
          status: formState.status,
          placedAt: formState.placedAt,
          notes: formState.notes.trim() || undefined,
        },
        ...prev,
      ])
      setBanner({ type: 'success', message: `${id} created.` })
    }
    closeModal()
  }

  function handleDelete(order: SalesOrder) {
    if (!window.confirm(`Delete order ${order.id}?`)) return
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    setBanner({ type: 'success', message: `${order.id} removed.` })
  }

  function setStatusQuick(order: SalesOrder, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)))
    setBanner({ type: 'success', message: `${order.id} → ${status}.` })
  }

  if (isLoading) {
    return <main className="min-h-screen px-8 py-10 text-white/60">Loading orders...</main>
  }

  if (!user || user.role !== 'sales_manager') return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Sales Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Manage Orders</h1>
              <p className="mt-2 text-sm text-white/60">
                Review and update orders with local mock data until the orders API is connected.
              </p>
            </div>
            <Link
              href="/sales-dashboard"
              className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-primary/40 hover:text-primary"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        {banner ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{banner.message}</span>
              <button type="button" onClick={() => setBanner(null)} className="text-white/60 hover:text-white">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <section className="glass-panel mt-6 rounded-3xl border border-white/10 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, customer, or email"
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-primary/40"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              New Order
            </button>
          </div>
        </section>

        <section className="glass-panel mt-6 rounded-3xl border border-white/10 p-5">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 py-12 text-center text-white/50">
              No orders match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Order ID</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Items</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Placed</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Quick status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={order.id} className="border-b border-white/5">
                      <td className="px-3 py-3 font-medium text-white">{order.id}</td>
                      <td className="px-3 py-3">
                        <p className="text-white/90">{order.customer}</p>
                        <p className="text-xs text-white/45">{order.email}</p>
                      </td>
                      <td className="px-3 py-3 text-white/75">{order.itemCount}</td>
                      <td className="px-3 py-3 text-white/85">${order.amount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-white/65">{order.placedAt}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={order.status}
                          onChange={(e) => setStatusQuick(order, e.target.value as OrderStatus)}
                          className="rounded-lg border border-white/15 bg-white/[0.05] px-2 py-1 text-xs text-white outline-none"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(order)}
                            className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/85 transition hover:border-primary/40 hover:text-primary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(order)}
                            className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{editingId ? `Edit ${editingId}` : 'New Order'}</h2>
              <button type="button" onClick={closeModal} className="text-white/60 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-white/70">Customer</span>
                <input
                  value={formState.customer}
                  onChange={(e) => setFormState((p) => ({ ...p, customer: e.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                />
                {formErrors.customer ? <span className="mt-1 block text-xs text-rose-300">{formErrors.customer}</span> : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/70">Email</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                />
                {formErrors.email ? <span className="mt-1 block text-xs text-rose-300">{formErrors.email}</span> : null}
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Item count</span>
                  <input
                    type="number"
                    min={1}
                    value={formState.itemCount}
                    onChange={(e) => setFormState((p) => ({ ...p, itemCount: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                  />
                  {formErrors.itemCount ? (
                    <span className="mt-1 block text-xs text-rose-300">{formErrors.itemCount}</span>
                  ) : null}
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Amount (USD)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formState.amount}
                    onChange={(e) => setFormState((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                  />
                  {formErrors.amount ? <span className="mt-1 block text-xs text-rose-300">{formErrors.amount}</span> : null}
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Placed date</span>
                  <input
                    type="date"
                    value={formState.placedAt}
                    onChange={(e) => setFormState((p) => ({ ...p, placedAt: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                  />
                  {formErrors.placedAt ? (
                    <span className="mt-1 block text-xs text-rose-300">{formErrors.placedAt}</span>
                  ) : null}
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Status</span>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value as OrderStatus }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-white/70">Notes (optional)</span>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 hover:border-white/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
                >
                  {editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
