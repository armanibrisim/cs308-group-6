'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../../context/AuthContext'

type DiscountType = 'percent' | 'fixed'
type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'inactive'

interface Discount {
  id: string
  code: string
  type: DiscountType
  value: number
  minOrderAmount?: number
  startDate: string
  endDate: string
  status: DiscountStatus
  description?: string
}

interface DiscountFormState {
  code: string
  type: DiscountType
  value: string
  minOrderAmount: string
  startDate: string
  endDate: string
  status: DiscountStatus
  description: string
}

type FormErrors = Partial<Record<keyof DiscountFormState, string>>

const INITIAL_DISCOUNTS: Discount[] = [
  {
    id: 'd-1001',
    code: 'SPRING20',
    type: 'percent',
    value: 20,
    minOrderAmount: 100,
    startDate: '2026-03-10',
    endDate: '2026-04-10',
    status: 'active',
    description: 'Spring campaign for selected categories.',
  },
  {
    id: 'd-1002',
    code: 'WELCOME10',
    type: 'fixed',
    value: 10,
    minOrderAmount: 50,
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    status: 'active',
    description: 'New customer first-order incentive.',
  },
  {
    id: 'd-1003',
    code: 'APRIL15',
    type: 'percent',
    value: 15,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'scheduled',
    description: 'Planned monthly promo campaign.',
  },
  {
    id: 'd-1004',
    code: 'WINTER5',
    type: 'fixed',
    value: 5,
    startDate: '2025-12-01',
    endDate: '2026-01-15',
    status: 'expired',
    description: 'Legacy seasonal discount.',
  },
]

const EMPTY_FORM: DiscountFormState = {
  code: '',
  type: 'percent',
  value: '',
  minOrderAmount: '',
  startDate: '',
  endDate: '',
  status: 'active',
  description: '',
}

const STATUS_OPTIONS: DiscountStatus[] = ['active', 'scheduled', 'expired', 'inactive']

const STATUS_BADGE_STYLES: Record<DiscountStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  scheduled: 'bg-sky-500/10 text-sky-300 border border-sky-500/30',
  expired: 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/30',
  inactive: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
}

function getEmptyFormWithDefaults(): DiscountFormState {
  const today = new Date().toISOString().slice(0, 10)
  return { ...EMPTY_FORM, startDate: today, endDate: today }
}

function toFormState(discount: Discount): DiscountFormState {
  return {
    code: discount.code,
    type: discount.type,
    value: String(discount.value),
    minOrderAmount: discount.minOrderAmount ? String(discount.minOrderAmount) : '',
    startDate: discount.startDate,
    endDate: discount.endDate,
    status: discount.status,
    description: discount.description ?? '',
  }
}

function formatDiscountValue(type: DiscountType, value: number): string {
  return type === 'percent' ? `${value}%` : `$${value.toFixed(2)}`
}

export default function SalesManagerDiscountsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [discounts, setDiscounts] = useState<Discount[]>(INITIAL_DISCOUNTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DiscountStatus>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<DiscountFormState>(getEmptyFormWithDefaults())
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== 'sales_manager') router.replace('/login')
  }, [isLoading, router, user])

  const filteredDiscounts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return discounts.filter((discount) => {
      const matchesSearch =
        query.length === 0 ||
        discount.code.toLowerCase().includes(query) ||
        (discount.description ?? '').toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all' || discount.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [discounts, searchTerm, statusFilter])

  function openCreateForm() {
    setEditingId(null)
    setFormErrors({})
    setFormState(getEmptyFormWithDefaults())
    setIsFormOpen(true)
  }

  function openEditForm(discount: Discount) {
    setEditingId(discount.id)
    setFormErrors({})
    setFormState(toFormState(discount))
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingId(null)
    setFormErrors({})
  }

  function validateForm(): { ok: boolean; parsedValue?: number; parsedMinOrder?: number } {
    const errors: FormErrors = {}
    const normalizedCode = formState.code.trim().toUpperCase()
    const parsedValue = Number(formState.value)
    const parsedMinOrder = formState.minOrderAmount.trim() ? Number(formState.minOrderAmount) : undefined

    if (normalizedCode.length < 3) errors.code = 'Code must be at least 3 characters.'
    if (!formState.startDate) errors.startDate = 'Start date is required.'
    if (!formState.endDate) errors.endDate = 'End date is required.'
    if (formState.startDate && formState.endDate && formState.endDate < formState.startDate) {
      errors.endDate = 'End date must be equal to or after start date.'
    }
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) errors.value = 'Value must be greater than 0.'
    if (formState.type === 'percent' && parsedValue > 100) {
      errors.value = 'Percent value cannot exceed 100.'
    }
    if (parsedMinOrder !== undefined && (!Number.isFinite(parsedMinOrder) || parsedMinOrder < 0)) {
      errors.minOrderAmount = 'Minimum order amount must be 0 or greater.'
    }
    const duplicateCode = discounts.some(
      (item) => item.id !== editingId && item.code.toLowerCase() === normalizedCode.toLowerCase()
    )
    if (duplicateCode) errors.code = 'Discount code already exists.'

    setFormErrors(errors)
    return { ok: Object.keys(errors).length === 0, parsedValue, parsedMinOrder }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = validateForm()
    if (!result.ok || result.parsedValue === undefined) {
      setBanner({ type: 'error', message: 'Please fix validation errors before saving.' })
      return
    }

    const payload: Discount = {
      id: editingId ?? `d-${Date.now()}`,
      code: formState.code.trim().toUpperCase(),
      type: formState.type,
      value: result.parsedValue,
      minOrderAmount: result.parsedMinOrder,
      startDate: formState.startDate,
      endDate: formState.endDate,
      status: formState.status,
      description: formState.description.trim() || undefined,
    }

    if (editingId) {
      setDiscounts((prev) => prev.map((item) => (item.id === editingId ? payload : item)))
      setBanner({ type: 'success', message: `${payload.code} updated successfully.` })
    } else {
      setDiscounts((prev) => [payload, ...prev])
      setBanner({ type: 'success', message: `${payload.code} created successfully.` })
    }

    closeForm()
  }

  function handleDelete(discount: Discount) {
    const confirmed = window.confirm(`Delete discount ${discount.code}? This action cannot be undone.`)
    if (!confirmed) return
    setDiscounts((prev) => prev.filter((item) => item.id !== discount.id))
    setBanner({ type: 'success', message: `${discount.code} deleted.` })
  }

  function handleToggleStatus(discount: Discount) {
    const nextStatus: DiscountStatus = discount.status === 'active' ? 'inactive' : 'active'
    setDiscounts((prev) => prev.map((item) => (item.id === discount.id ? { ...item, status: nextStatus } : item)))
    setBanner({
      type: 'success',
      message: `${discount.code} is now ${nextStatus}.`,
    })
  }

  if (isLoading) {
    return <main className="min-h-screen px-8 py-10 text-white/60">Loading discount module...</main>
  }

  if (!user || user.role !== 'sales_manager') return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="glass-panel rounded-3xl border border-white/10 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Sales Module</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Manage Discounts</h1>
              <p className="mt-2 text-sm text-white/60">
                Create and control promo campaigns with local mock state until backend integration is ready.
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
              placeholder="Search by code or description"
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-primary/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | DiscountStatus)}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-primary/40"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              New Discount
            </button>
          </div>
        </section>

        <section className="glass-panel mt-6 rounded-3xl border border-white/10 p-5">
          {filteredDiscounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 py-12 text-center text-white/50">
              No discounts match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Value</th>
                    <th className="px-3 py-3">Min Order</th>
                    <th className="px-3 py-3">Date Range</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiscounts.map((discount) => (
                    <tr key={discount.id} className="border-b border-white/5">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white">{discount.code}</p>
                        <p className="text-xs text-white/50">{discount.description ?? 'No description'}</p>
                      </td>
                      <td className="px-3 py-3 capitalize text-white/85">{discount.type}</td>
                      <td className="px-3 py-3 text-white/85">{formatDiscountValue(discount.type, discount.value)}</td>
                      <td className="px-3 py-3 text-white/70">
                        {discount.minOrderAmount ? `$${discount.minOrderAmount.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-white/70">
                        {discount.startDate} to {discount.endDate}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE_STYLES[discount.status]}`}
                        >
                          {discount.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(discount)}
                            className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/85 transition hover:border-primary/40 hover:text-primary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(discount)}
                            className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/85 transition hover:border-primary/40 hover:text-primary"
                          >
                            {discount.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(discount)}
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

      {isFormOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/10 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{editingId ? 'Edit Discount' : 'Create Discount'}</h2>
              <button type="button" onClick={closeForm} className="text-white/60 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Code</span>
                  <input
                    value={formState.code}
                    onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                    placeholder="SUMMER30"
                  />
                  {formErrors.code ? <span className="mt-1 block text-xs text-rose-300">{formErrors.code}</span> : null}
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Type</span>
                  <select
                    value={formState.type}
                    onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value as DiscountType }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Value</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.value}
                    onChange={(e) => setFormState((prev) => ({ ...prev, value: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                    placeholder={formState.type === 'percent' ? '15' : '10.00'}
                  />
                  {formErrors.value ? <span className="mt-1 block text-xs text-rose-300">{formErrors.value}</span> : null}
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Min Order Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.minOrderAmount}
                    onChange={(e) => setFormState((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                    placeholder="Optional"
                  />
                  {formErrors.minOrderAmount ? (
                    <span className="mt-1 block text-xs text-rose-300">{formErrors.minOrderAmount}</span>
                  ) : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Start Date</span>
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                  />
                  {formErrors.startDate ? (
                    <span className="mt-1 block text-xs text-rose-300">{formErrors.startDate}</span>
                  ) : null}
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-white/70">End Date</span>
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                  />
                  {formErrors.endDate ? <span className="mt-1 block text-xs text-rose-300">{formErrors.endDate}</span> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Status</span>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value as DiscountStatus }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/70">Description</span>
                  <input
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-white outline-none transition focus:border-primary/40"
                    placeholder="Optional details for the campaign"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  {editingId ? 'Save Changes' : 'Create Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
