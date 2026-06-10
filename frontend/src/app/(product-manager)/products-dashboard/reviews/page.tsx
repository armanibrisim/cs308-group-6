'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageHeader, PRODUCT_MANAGER_HEADER } from '../../../../components/dashboard/DashboardPageHeader'
import { useAuth } from '../../../../context/AuthContext'
import { reviewService, Review } from '../../../../services/reviewService'

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="material-symbols-outlined text-xs"
          style={{ fontVariationSettings: i < rating ? "'FILL' 1" : "'FILL' 0", color: i < rating ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.25)', fontSize: '0.85rem' }}
        >
          star
        </span>
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const token = user?.token ?? ''

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('PENDING')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'product_manager' && user.role !== 'admin') router.replace('/browse')
  }, [user, isLoading, router])

  const fetchReviews = useCallback(async (currentFilter: FilterType) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const statusParam = currentFilter === 'ALL' ? undefined : currentFilter.toLowerCase() as 'pending' | 'approved' | 'rejected'
      const data = await reviewService.getAllReviews(token, statusParam)
      setReviews(data)
    } catch {
      setError('Failed to load reviews. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchReviews(filter)
  }, [filter, fetchReviews, token])

  const handleStatusChange = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      setReviews(prev => prev.map(r => (r.id === id ? { ...r, status: status.toUpperCase() } : r)))
      try {
        await reviewService.updateReviewStatus(id, status, token)
      } catch {
        fetchReviews(filter)
      }
    },
    [token, fetchReviews, filter]
  )

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchesFilter = filter === 'ALL' || r.status.toUpperCase() === filter
      const matchesSearch =
        (r.product_name ?? r.product_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.username.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [reviews, filter, searchQuery])

  if (isLoading || !user || (user.role !== 'product_manager' && user.role !== 'admin')) return null

  return (
    <main className="min-h-screen px-8 py-10 text-white">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">

        <DashboardPageHeader
          {...PRODUCT_MANAGER_HEADER}
          title="Comments & Reviews"
        />

        {/* Search & Filters */}
        <section className="glass-panel rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" style={{ fontSize: '1.1rem' }}>search</span>
            <input
              type="text"
              placeholder="Search by product or user..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs py-3 pl-10 pr-4 rounded-xl outline-none"
              style={{ background: 'rgba(var(--c-text-rgb), 0.05)', border: '1px solid rgba(var(--c-text-rgb), 0.10)', color: 'var(--c-text)', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
                style={{
                  background: filter === f ? 'var(--c-neon)' : 'rgba(255,255,255,0.03)',
                  color: filter === f ? '#000' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${filter === f ? 'var(--c-neon)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(var(--c-neon-rgb),0.25)', borderTopColor: 'var(--c-neon)' }} />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <section className="glass-panel rounded-3xl border border-red-500/20 p-8 text-center">
            <p className="text-red-400 text-xs font-mono tracking-widest">{error}</p>
          </section>
        )}

        {/* Review cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredReviews.map(review => {
              const status = review.status.toUpperCase()
              const isPending = status === 'PENDING'
              const isApproved = status === 'APPROVED'
              return (
                <div
                  key={review.id}
                  className="glass-panel rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200"
                  style={{
                    border: `1px solid ${isApproved ? 'rgba(var(--c-neon-rgb),0.20)' : status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.20)'}`,
                    opacity: status === 'REJECTED' ? 0.55 : 1,
                  }}
                  onMouseEnter={e => { if (status === 'REJECTED') (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                  onMouseLeave={e => { if (status === 'REJECTED') (e.currentTarget as HTMLDivElement).style.opacity = '0.55' }}
                >
                  {/* Card header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--c-neon)' }}>
                        {review.product_name ?? review.product_id}
                      </p>
                      <p className="text-[10px] uppercase" style={{ color: 'rgba(var(--c-text-rgb), 0.45)' }}>{review.username}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {!isPending && (
                        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isApproved ? 'rgba(var(--c-neon-rgb),0.10)' : 'rgba(239,68,68,0.10)',
                            color: isApproved ? 'var(--c-neon)' : '#ef4444',
                            border: `1px solid ${isApproved ? 'rgba(var(--c-neon-rgb),0.20)' : 'rgba(239,68,68,0.20)'}`,
                          }}
                        >{status}</span>
                      )}
                      {isPending && (
                        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>PENDING</span>
                      )}
                      <StarRating rating={review.rating} />
                    </div>
                  </div>

                  {/* Comment */}
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(var(--c-text-rgb), 0.75)' }}>{review.comment || <span style={{ fontStyle: 'italic', color: 'rgba(var(--c-text-rgb), 0.25)' }}>No comment.</span>}</p>

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[9px] font-mono" style={{ color: 'rgba(var(--c-text-rgb), 0.35)' }}>
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                    </p>
                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(review.id, 'rejected')}
                          className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', background: 'transparent' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        >REJECT</button>
                        <button
                          onClick={() => handleStatusChange(review.id, 'approved')}
                          className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          style={{ color: '#000', background: 'var(--c-neon)', border: '1px solid var(--c-neon)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = '' }}
                        >APPROVE</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Refresh tile */}
            <button
              onClick={() => fetchReviews(filter)}
              className="glass-panel rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-200"
              style={{ border: '1px dashed rgba(var(--c-text-rgb), 0.12)', opacity: 0.4, cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.4' }}
            >
              <span className="material-symbols-outlined text-4xl mb-3" style={{ color: 'var(--c-neon)' }}>refresh</span>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-neon)' }}>Refresh Queue</p>
              <p className="text-[8px] mt-1" style={{ color: 'rgba(var(--c-text-rgb), 0.3)' }}>CLICK TO RELOAD</p>
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredReviews.length === 0 && (
          <section className="glass-panel rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-5xl mb-4 text-white/15">rate_review</span>
            <p className="text-sm font-mono tracking-widest uppercase" style={{ color: 'rgba(var(--c-text-rgb), 0.3)' }}>No reviews found</p>
          </section>
        )}

      </div>
    </main>
  )
}
