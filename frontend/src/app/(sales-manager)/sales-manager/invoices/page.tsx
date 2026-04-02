'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../../context/AuthContext'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

interface Invoice {
  id: string
  orderRef: string
  customer: string
  amount: number
  issuedAt: string
  dueAt: string
  status: InvoiceStatus
  notes?: string
}

interface InvoiceFormState {
  orderRef: string
  customer: string
  amount: string
  issuedAt: string
  dueAt: string
  status: InvoiceStatus
  notes: string
}

type FormErrors = Partial<Record<keyof InvoiceFormState, string>>

const STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue']

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/30',
  sent: 'bg-sky-500/10 text-sky-300 border border-sky-500/30',
  paid: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  overdue: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
}

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-1042',
    orderRef: 'ORD-29014',
    customer: 'Arda Demir',
    amount: 1249,
    issuedAt: '2026-03-25',
    dueAt: '2026-04-09',
    status: 'paid',
  },
  {
    id: 'INV-1041',
    orderRef: 'ORD-29010',
    customer: 'Elif Yaman',
    amount: 379.99,
    issuedAt: '2026-03-25',
    dueAt: '2026-04-09',
    status: 'sent',
  },
  {
    id: 'INV-1038',
    orderRef: 'ORD-29002',
    customer: 'Mert Aksoy',
    amount: 2149.5,
    issuedAt: '2026-03-24',
    dueAt: '2026-04-08',
    status: 'overdue',
  },
  {
    id: 'INV-1035',
    orderRef: 'ORD-28990',
    customer: 'Burak Acar',
    amount: 849,
    issuedAt: '2026-03-22',
    dueAt: '2026-04-06',
    status: 'draft',
  },
]

function emptyForm(): InvoiceFormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    orderRef: '',
    customer: '',
    amount: '',
    issuedAt: today,
    dueAt: today,
    status: 'draft',
    notes: '',
  }
}

function toForm(inv: Invoice): InvoiceFormState {
  return {
    orderRef: inv.orderRef,
    customer: inv.customer,
    amount: String(inv.amount),
    issuedAt: inv.issuedAt,
    dueAt: inv.dueAt,
    status: inv.status,
    notes: inv.notes ?? '',
  }
}

function nextInvoiceId(existing: Invoice[]): string {
  const nums = existing
    .map((i) => {
      const m = /^INV-(\d+)$/i.exec(i.id)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const max = nums.length ? Math.max(...nums) : 1034
  return `INV-${max + 1}`
}

export default function SalesManagerInvoicesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<InvoiceFormState>(() => emptyForm())
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== 'sales_manager') router.replace('/login')
  }, [isLoading, router, user])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return invoices.filter((inv) => {
      const matchQ =
        q.length === 0 ||
        inv.id.toLowerCase().includes(q) ||
        inv.orderRef.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q)
      const matchS = statusFilter === 'all' || inv.status === statusFilter
      return matchQ && matchS
    })
  }, [invoices, searchTerm, statusFilter])

  function openCreate() {
    setEditingId(null)
    setFormErrors({})
    setFormState(emptyForm())
    setModalOpen(true)
  }

  function openEdit(inv: Invoice) {
    setEditingId(inv.id)
    setFormErrors({})
    setFormState(toForm(inv))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setFormErrors({})
  }

  function validate(): { ok: boolean; parsedAmount?: number } {
    const errors: FormErrors = {}
    const orderRef = formState.orderRef.trim()
    if (!orderRef) errors.orderRef = 'Order reference is required.'
    if (!formState.customer.trim()) errors.customer = 'Customer is required.'
    const amount = Number(formState.amount)
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than 0.'
    if (!formState.issuedAt) errors.issuedAt = 'Issue date is required.'
    if (!formState.dueAt) errors.dueAt = 'Due date is required.'
    if (formState.issuedAt && formState.dueAt && formState.dueAt < formState.issuedAt) {
      errors.dueAt = 'Due date must be on or after issue date.'
    }

    const dupOrder = invoices.some(
      (i) =>
        i.id !== editingId && i.orderRef.toLowerCase() === orderRef.toLowerCase()
    )
    if (dupOrder) errors.orderRef = 'An invoice for this order already exists.'

    setFormErrors(errors)
    if (Object.keys(errors).length) return { ok: false }
    return { ok: true, parsedAmount: amount }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    if (!v.ok || v.parsedAmount === undefined) {
      setBanner({ type: 'error', message: 'Please fix the form errors.' })
      return
    }

    if (editingId) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === editingId
            ? {
                ...i,
                orderRef: formState.orderRef.trim(),
                customer: formState.customer.trim(),
                amount: v.parsedAmount!,
                issuedAt: formState.issuedAt,
                dueAt: formState.dueAt,
                status: formState.status,
                notes: formState.notes.trim() || undefined,
              }
            : i
        )
      )
      setBanner({ type: 'success', message: `${editingId} updated.` })
    } else {
      const id = nextInvoiceId(invoices)
      setInvoices((prev) => [
        {
          id,
          orderRef: formState.orderRef.trim(),
          customer: formState.customer.trim(),
          amount: v.parsedAmount!,
          issuedAt: formState.issuedAt,
          dueAt: formState.dueAt,
          status: formState.status,
          notes: formState.notes.trim() || undefined,
        },
        ...prev,
      ])
      setBanner({ type: 'success', message: `${id} created.` })
    }
    closeModal()
  }

  function handleDelete(inv: Invoice) {
    if (!window.confirm(`Delete invoice ${inv.id}?`)) return
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id))
    setBanner({ type: 'success', message: `${inv.id} removed.` })
  }

  function markPaid(inv: Invoice) {
    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'paid' as const } : i)))
    setBanner({ type: 'success', message: `${inv.id} marked as paid.` })
  }

  function mockDownloadPdf(inv: Invoice) {
    setBanner({
      type: 'success',
      message: `Mock PDF download for ${inv.id} (backend PDF endpoint not wired yet).`,
    })
  }

  if (isLoading) {
    return <main className="min-h-screen px-8 py-10 text-white/60">Loading invoices...</main>
  }

  if (!user || user.role !== 'sales_manager') return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Sales Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Manage Invoices</h1>
              <p className="mt-2 text-sm text-white/60">
                Track invoices and payment state with mock data; wire PDF download when the API is ready.
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
              placeholder="Search by invoice ID, order ref, or customer"
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | InvoiceStatus)}
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
              New Invoice
            </button>
          </div>
        </section>

        <section className="glass-panel mt-6 rounded-3xl border border-white/10 p-5">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 py-12 text-center text-white/50">
              No invoices match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Invoice</th>
                    <th className="px-3 py-3">Order</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Issued</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-white/5">
                      <td className="px-3 py-3 font-medium text-white">{inv.id}</td>
                      <td className="px-3 py-3 text-white/75">{inv.orderRef}</td>
                      <td className="px-3 py-3 text-white/85">{inv.customer}</td>
                      <td className="px-3 py-3 text-white/85">${inv.amount.toFixed(2)}</td>
                      <td className="px-3 py-3 text-white/65">{inv.issuedAt}</td>
                      <td className="px-3 py-3 text-white/65">{inv.dueAt}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[inv.status]}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => mockDownloadPdf(inv)}
                            className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/85 transition hover:border-primary/40 hover:text-primary"
                          >
                            PDF
                          </button>
                          {inv.status !== 'paid' ? (
                            <button
                              type="button"
                              onClick={() => markPaid(inv)}
                              className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/10"
                            >
                              Mark paid
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEdit(inv)}
                            className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/85 transition hover:border-primary/40 hover:text-primary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(inv)}
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
              <h2 className="text-xl font-semibold text-white">{editingId ? `Edit ${editingId}` : 'New Invoice'}</h2>
              <button type="button" onClick={closeModal} className="text-white/60 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-white/70">Order reference</span>
                <input
                  value={formState.orderRef}
                  onChange={(e) => setFormState((p) => ({ ...p, orderRef: e.target.value }))}
                  placeholder="ORD-29014"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                />
                {formErrors.orderRef ? (
                  <span className="mt-1 block text-xs text-rose-300">{formErrors.orderRef}</span>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/70">Customer</span>
                <input
                  value={formState.customer}
                  onChange={(e) => setFormState((p) => ({ ...p, customer: e.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                />
                {formErrors.customer ? (
                  <span className="mt-1 block text-xs text-rose-300">{formErrors.customer}</span>
                ) : null}
              </label>
              <label className="block text-sm">
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
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Issued</span>
                  <input
                    type="date"
                    value={formState.issuedAt}
                    onChange={(e) => setFormState((p) => ({ ...p, issuedAt: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                  />
                  {formErrors.issuedAt ? (
                    <span className="mt-1 block text-xs text-rose-300">{formErrors.issuedAt}</span>
                  ) : null}
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Due</span>
                  <input
                    type="date"
                    value={formState.dueAt}
                    onChange={(e) => setFormState((p) => ({ ...p, dueAt: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                  />
                  {formErrors.dueAt ? <span className="mt-1 block text-xs text-rose-300">{formErrors.dueAt}</span> : null}
                </label>
              </div>
              <label className="text-sm">
                <span className="mb-1 block text-white/70">Status</span>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value as InvoiceStatus }))}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none focus:border-primary/40"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
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
