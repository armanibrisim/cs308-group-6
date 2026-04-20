'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { reviewService, Review } from '../../../services/reviewService'

type TabType = 'COMMENTS' | 'PRODUCTS' | 'STOCK' | 'DELIVERIES'
type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-xs ${i < rating ? 'text-[#39ff14]' : ''}`}
          style={{ fontVariationSettings: i < rating ? "'FILL' 1" : "'FILL' 0", color: i < rating ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.30)' }}
        >
          star
        </span>
      ))}
    </div>
  )
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1
        className="text-6xl font-black tracking-tight text-[#39ff14] mb-4 uppercase"
        style={{ textShadow: '0 0 8px var(--c-neon)' }}
      >
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
        <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
          COMING SOON — AVAILABLE AFTER PROGRESS DEMO
        </p>
      </div>
    </div>
  )
}

export default function ProductManagerDashboard() {
  const { user } = useAuth()
  const token = user?.token ?? ''

  const [activeTab, setActiveTab] = useState<TabType>('COMMENTS')
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('PENDING')
  const [searchQuery, setSearchQuery] = useState('')

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
    if (activeTab === 'COMMENTS') fetchReviews(filter)
  }, [activeTab, filter, fetchReviews])

  const handleStatusChange = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      // Optimistic update
      setReviews(prev =>
        prev.map(r => (r.id === id ? { ...r, status: status.toUpperCase() } : r))
      )
      try {
        await reviewService.updateReviewStatus(id, status, token)
      } catch {
        // Revert on failure
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

  const pendingCount = reviews.filter(r => r.status.toUpperCase() === 'PENDING').length

  return (
    <div className="atmospheric-bg min-h-screen" style={{ color: 'var(--c-text)' }}>
      {/* Progress bar just below the global Navbar */}
      <div className="fixed top-[80px] left-0 right-0 h-[2px] bg-zinc-900 z-40">
        <div
          className="h-full w-[65%]"
          style={{
            background: 'linear-gradient(to right, var(--c-neon), rgba(var(--c-neon-rgb), 0.4))',
            boxShadow: '0 0 10px var(--c-neon)',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-12 py-10">
        {/* Tab navigation */}
        <nav className="flex gap-6 mb-12 border-b border-white/[0.07] text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {(['COMMENTS', 'PRODUCTS', 'STOCK', 'DELIVERIES'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 transition-all duration-300 ${
                activeTab === tab
                  ? 'text-[#39ff14] border-b-2 border-[#39ff14]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === 'COMMENTS' ? (
          <>
            {/* Header */}
            <section className="mb-12">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-[#39ff14] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>PRODUCT MANAGER</p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Comments</h1>
              <p className="text-xs text-zinc-500 tracking-widest" style={{ fontFamily: 'Inter, sans-serif' }}>
                MODERATION QUEUE /{' '}
                {user?.first_name
                  ? `${user.first_name.toUpperCase()}_PM`
                  : 'PRODUCT_MANAGER_01'}
              </p>
            </section>

            {/* Search & Filters */}
            <section className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 p-6 rounded-xl border border-white/[0.07]" style={{ background: 'var(--c-panel)' }}>
              <div className="relative w-full md:w-1/2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-500 text-sm">
                  search
                </span>
                <input
                  className="w-full border text-xs py-3 pl-12 pr-4 focus:outline-none transition-colors placeholder:text-zinc-600 text-white rounded-lg"
                  style={{ background: 'rgba(var(--c-text-rgb), 0.04)', borderColor: 'rgba(var(--c-text-rgb), 0.1)', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--c-neon)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(var(--c-text-rgb), 0.1)')}
                  placeholder="SEARCH BY PRODUCT OR CUSTOMER..."
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2 font-bold text-[10px] uppercase tracking-wider rounded border transition-all ${
                      filter === f
                        ? 'bg-[#39ff14] text-black border-[#39ff14]'
                        : 'text-zinc-400 border-white/10 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </section>

            {/* Loading state */}
            {loading && (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-20 text-red-400 text-xs font-mono tracking-widest">
                {error}
              </div>
            )}

            {/* Moderation grid */}
            {!loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredReviews.map(review => {
                  const status = review.status.toUpperCase()
                  return (
                    <div
                      key={review.id}
                      style={{ background: 'var(--c-panel)' }}
                      className={`p-6 border-l-[3px] rounded-r-xl relative transition-all ${
                        status === 'APPROVED'
                          ? 'border-[#39ff14]'
                          : status === 'REJECTED'
                          ? 'border-red-500 opacity-50 grayscale hover:grayscale-0 hover:opacity-100'
                          : 'border-yellow-500'
                      }`}
                    >
                      {status !== 'PENDING' && (
                        <div
                          className={`absolute top-4 right-4 text-[8px] px-2 py-0.5 font-bold border ${
                            status === 'APPROVED'
                              ? 'bg-green-500/10 text-[#39ff14] border-[#39ff14]/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}
                        >
                          {status}
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[10px] text-[#39ff14] font-bold uppercase tracking-widest mb-1">
                            {review.product_name ?? review.product_id}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase">{review.username}</div>
                        </div>
                        <div className={status !== 'PENDING' ? 'mr-16' : ''}>
                          <StarRating rating={review.rating} />
                        </div>
                      </div>

                      <p className="text-sm text-white leading-relaxed mb-6">{review.comment}</p>

                      <div className="flex justify-between items-end">
                        <div className="text-[9px] text-zinc-500 font-mono">
                          {new Date(review.created_at)
                            .toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                            })
                            .toUpperCase()}
                        </div>
                        {status === 'PENDING' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleStatusChange(review.id, 'rejected')}
                              className="text-[9px] font-bold text-red-500 px-3 py-1.5 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"
                            >
                              REJECT
                            </button>
                            <button
                              onClick={() => handleStatusChange(review.id, 'approved')}
                              className="text-[9px] font-bold text-[#39ff14] px-3 py-1.5 border border-[#39ff14]/30 hover:bg-[#39ff14] hover:text-black transition-all"
                            >
                              APPROVE
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Refresh tile */}
                <button
                  onClick={() => fetchReviews(filter)}
                  style={{ background: 'rgba(var(--c-text-rgb), 0.02)' }}
                  className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-4xl mb-4 text-[#39ff14]">refresh</span>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#39ff14]">
                    Refresh Queue
                  </div>
                  <div className="text-[8px] text-zinc-600 mt-2">CLICK TO RELOAD</div>
                </button>
              </div>
            )}
          </>
        ) : (
          <PlaceholderView title={activeTab} />
        )}
      </div>

      {/* Status toast */}
      <div className="fixed bottom-8 right-8 z-50">
        <div
          className="p-4 border border-[#39ff14]/20 rounded shadow-2xl flex items-center gap-4"
          style={{ background: 'var(--c-panel)' }}
        >
          <div className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
          <div className="text-[10px] font-mono">
            <span className="text-zinc-500">SYSTEM_STATUS:</span>
            <span className="text-[#39ff14] font-bold ml-1">MONITORING_ACTIVE</span>
          </div>
          <div className="pl-4 border-l border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase">
            {pendingCount} Pending Actions
          </div>
        </div>
      </div>
    </div>
  )
}
