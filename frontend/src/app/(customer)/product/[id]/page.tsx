'use client'

import { useState, useRef, MouseEvent, useEffect, useMemo, useReducer, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productService } from '../../../../services/productService'
import { cartService } from '../../../../services/cartService'
import { reviewService, Review } from '../../../../services/reviewService'
import { useAuth } from '../../../../context/AuthContext'
import { useWishlist } from '../../../../context/WishlistContext'
import { SideNav } from '../../../../components/layout/SideNav'

const NEON = 'var(--c-neon)'
const NEON_RGB = 'var(--c-neon-rgb)'

type VoteData = { likes: number; dislikes: number; voted: 'like' | 'dislike' | null }
type VotesAction =
  | { type: 'SET'; id: string; data: VoteData }
  | { type: 'RESET'; map: Map<string, VoteData> }
function votesReducer(state: Map<string, VoteData>, action: VotesAction): Map<string, VoteData> {
  if (action.type === 'SET') return new Map(state).set(action.id, action.data)
  return action.map
}

const tabs = [
  { id: 'desc', label: 'PRODUCT DESCRIPTION' },
  { id: 'specs', label: 'TECHNICAL SPECS' },
  { id: 'reviews', label: 'USER REVIEWS' },
  { id: 'returns', label: 'RETURN POLICY' },
]

/** A card/box with the hover-glow mouse-tracking effect. */
function GlowBox({
  children,
  className = '',
  style,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={`hover-glow grounded-box ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { user } = useAuth()
  const { isSaved, toggle: toggleWishlist } = useWishlist()

  const [activeTab, setActiveTab] = useState('desc')
  const [showCatalogue, setShowCatalogue] = useState(false)
  const [mainImage, setMainImage] = useState('')
  const [imgOpacity, setImgOpacity] = useState(1)
  const [arrowsVisible, setArrowsVisible] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [qty, setQty] = useState(1)
  const [cartStatus, setCartStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cartError, setCartError] = useState('')
  const [copied, setCopied] = useState(false)

  // ── Reviews ──
  const commentsRef = useRef<HTMLDivElement>(null)
  const [reviewFilter, setReviewFilter] = useState<0|1|2|3|4|5>(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [hoverStar, setHoverStar] = useState(0)
  const [localReviews, setLocalReviews] = useState<Review[]>([])
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [reviewsReady, setReviewsReady] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewVotes, dispatchVotes] = useReducer(votesReducer, new Map<string, VoteData>())
  const [reviewSort, setReviewSort] = useState<'default'|'most_liked'|'most_disliked'>('default')

  // ── Memoized derived values ──
  const ratingStats = useMemo(() => {
    const backendAvg = product?.average_rating ?? product?.rating ?? null
    const backendCount = product?.review_count ?? 0
    const totalCount = backendCount + localReviews.length
    const localAvg = localReviews.length > 0
      ? localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length
      : null
    const avg = localAvg != null && backendAvg != null
      ? (backendAvg * backendCount + localAvg * localReviews.length) / totalCount
      : localAvg ?? backendAvg
    return { avg, totalCount, backendCount }
  }, [product, localReviews])

  const allReviews = useMemo(
    () => [...(product?.reviews || []), ...localReviews],
    [product, localReviews]
  )

  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: allReviews.length }
    for (const r of allReviews) {
      const s = (r as any).rating
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  }, [allReviews])

  const filteredReviews = useMemo(() => {
    const base = reviewFilter === 0 ? allReviews : allReviews.filter((r: any) => r.rating === reviewFilter)
    return [...base].sort((a: any, b: any) => {
      const av = reviewVotes.get(a.id || '') ?? { likes: a.likes ?? 0, dislikes: a.dislikes ?? 0 }
      const bv = reviewVotes.get(b.id || '') ?? { likes: b.likes ?? 0, dislikes: b.dislikes ?? 0 }
      if (reviewSort === 'most_liked') return bv.likes - av.likes
      if (reviewSort === 'most_disliked') return bv.dislikes - av.dislikes
      return 0
    })
  }, [allReviews, reviewFilter, reviewSort, reviewVotes])

  const handleVote = (reviewId: string, type: 'like'|'dislike') => {
    if (!user?.token) { router.push('/login'); return }

    // Optimistic update
    const prev = reviewVotes.get(reviewId) || { likes: 0, dislikes: 0, voted: null }
    const toggling = prev.voted === type
    const switching = prev.voted && prev.voted !== type
    const optimistic: VoteData = {
      likes: prev.likes
        + (type === 'like' ? (toggling ? -1 : 1) : (switching && prev.voted === 'like' ? -1 : 0)),
      dislikes: prev.dislikes
        + (type === 'dislike' ? (toggling ? -1 : 1) : (switching && prev.voted === 'dislike' ? -1 : 0)),
      voted: (toggling ? null : type) as 'like'|'dislike'|null,
    }
    dispatchVotes({ type: 'SET', id: reviewId, data: optimistic })

    // Sync with backend in background — revert on failure
    reviewService.voteReview(reviewId, type, user.token).then((result) => {
      dispatchVotes({ type: 'SET', id: reviewId, data: { likes: result.likes, dislikes: result.dislikes, voted: result.user_vote as 'like'|'dislike'|null } })
    }).catch(() => {
      dispatchVotes({ type: 'SET', id: reviewId, data: prev })
    })
  }

  const scrollToComments = () => {
    setActiveTab('reviews')
    setTimeout(() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleDeleteReview = async () => {
    if (!user?.token || !myReview) return
    if (!window.confirm('Delete your review? This cannot be undone.')) return
    try {
      await reviewService.deleteReview(myReview.id, user.token)
      setLocalReviews(prev => prev.filter(r => r.id !== myReview.id))
      setMyReview(null)
      setShowReviewForm(false)
      setIsEditMode(false)
      setNewReview({ rating: 5, comment: '' })
    } catch {
      // silent — review stays visible
    }
  }

  const submitReview = async () => {
    if (!user?.token) return
    setReviewSubmitting(true)
    setReviewError('')
    try {
      if (isEditMode && myReview) {
        const updated = await reviewService.updateReview(myReview.id, newReview.rating, newReview.comment.trim(), user.token)
        setLocalReviews(prev => prev.map(r => r.id === myReview.id ? updated : r))
        setMyReview(updated)
        setReviewSuccessMsg(updated.status === 'approved' ? 'REVIEW UPDATED!' : 'REVIEW UPDATED — PENDING APPROVAL')
      } else {
        const submitted = await reviewService.submitReview(id, newReview.rating, newReview.comment.trim(), user.token)
        setLocalReviews(prev => [submitted, ...prev])
        setMyReview(submitted)
        setReviewSuccessMsg(submitted.status === 'approved' ? 'RATING SUBMITTED!' : 'REVIEW SUBMITTED — PENDING APPROVAL')
      }
      setNewReview({ rating: 5, comment: '' })
      setShowReviewForm(false)
      setIsEditMode(false)
      setReviewSuccess(true)
      setTimeout(() => setReviewSuccess(false), 4000)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('409')) {
        setReviewError('You have already reviewed this product.')
      } else {
        setReviewError('Failed to submit review. Please try again.')
      }
    } finally {
      setReviewSubmitting(false)
    }
  }

  useEffect(() => {
    if (!id) return
    window.scrollTo({ top: 0, behavior: 'instant' })
    setLoading(true)
    setReviewsReady(false)

    // Fire all independent requests in parallel
    const productP    = productService.getProduct(id).catch(() => null)
    const reviewsP    = reviewService.getApprovedReviews(id).catch(() => [] as Review[])
    const myReviewP   = user?.token ? reviewService.getMyReview(id, user.token).catch(() => null) : Promise.resolve(null)
    const myVotesP    = user?.token ? reviewService.getMyVotes(id, user.token).catch(() => ({})) : Promise.resolve({})

    Promise.all([productP, reviewsP, myReviewP, myVotesP])
      .then(([data, reviews, ownReview, votes]) => {
        // ── Product ──
        if (data) {
          setProduct(data)
          const images: string[] = (data as any).all_images || []
          if (images.length > 0) {
            setThumbnails(images)
            setMainImage(images[0])
          } else {
            const single = (data as any).image_url
            if (single) { setThumbnails([single]); setMainImage(single) }
          }
          // Related products depend on category — start as soon as product resolves
          const catId = (data as any).category_id || (data as any).categoryId
          if (catId) {
            productService
              .getProducts({ categoryId: catId, limit: 8 })
              .then((res) => setRelatedProducts(res.products.filter((p: any) => p.id !== data.id)))
              .catch(() => {})
          }
        }

        // ── Reviews + votes merged in one pass ──
        const alreadyIncluded = ownReview && reviews.some((r) => r.id === ownReview!.id)
        const merged = ownReview && !alreadyIncluded ? [ownReview, ...reviews] : reviews
        setLocalReviews(merged)
        setMyReview(ownReview)
        setReviewsReady(true)

        const voteMap = new Map<string, VoteData>()
        merged.forEach((r) => {
          voteMap.set(r.id, { likes: r.likes ?? 0, dislikes: r.dislikes ?? 0, voted: null })
        })
        // Apply user votes in the same pass — no second setState needed
        Object.entries(votes).forEach(([reviewId, voteType]) => {
          voteMap.set(reviewId, { ...(voteMap.get(reviewId) || { likes: 0, dislikes: 0 }), voted: voteType as 'like' | 'dislike' })
        })
        dispatchVotes({ type: 'RESET', map: voteMap })
      })
      .finally(() => setLoading(false))
  }, [id, user?.token])

  const switchImage = (src: string) => {
    setImgOpacity(0)
    setTimeout(() => {
      setMainImage(src)
      setImgOpacity(1)
    }, 250)
  }

  const navigateImage = (direction: number) => {
    const idx = thumbnails.indexOf(mainImage)
    switchImage(thumbnails[(idx + direction + thumbnails.length) % thumbnails.length])
  }

  if (loading) {
    return (
      <div className="atmospheric-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em' }}>
        LOADING METRICS...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="atmospheric-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(var(--c-text-rgb), 0.4)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em' }}>
        ENTITY NOT FOUND
      </div>
    )
  }

  const stockQty = product?.stock_quantity ?? product?.stockQuantity ?? 0
  const inStock = stockQty > 0

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)', fontFamily: 'Inter, sans-serif' }}>
      <SideNav />
      <main style={{ position: 'relative', zIndex: 10, paddingTop: '2.5rem', paddingBottom: '8rem', paddingLeft: '10rem', paddingRight: '3rem', maxWidth: '1920px', margin: '0 auto' }}>

        {/* ── Product Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '5rem', alignItems: 'start' }}>

          {/* ── Left: Image Gallery ── */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Main image */}
            <GlowBox className="product-img-box" style={{ borderRadius: '1.5rem', aspectRatio: '16/10', overflow: 'hidden' }}>
              <div
                style={{ position: 'absolute', inset: 0 }}
                onMouseEnter={() => setArrowsVisible(true)}
                onMouseLeave={() => setArrowsVisible(false)}
              >
                {mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mainImage}
                    alt="Product"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      opacity: imgOpacity,
                      transition: 'opacity 0.25s ease, transform 0.7s ease',
                      transform: arrowsVisible ? 'scale(1.04)' : 'scale(1)',
                    }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'rgba(var(--c-text-rgb), 0.1)' }}>image_not_supported</span>
                  </div>
                )}
                {/* Navigation Arrows — only render when there are multiple images */}
                {thumbnails.length > 1 && <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    opacity: arrowsVisible ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    zIndex: 20,
                    borderRadius: '1.5rem',
                  }}
                >
                  <button
                    onClick={() => navigateImage(-1)}
                    style={{
                      padding: '1rem',
                      background: 'rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '50%',
                      border: 'none',
                      color: NEON,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(var(--c-neon-rgb), 0.2)`; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>chevron_left</span>
                  </button>
                  <button
                    onClick={() => navigateImage(1)}
                    style={{
                      padding: '1rem',
                      background: 'rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '50%',
                      border: 'none',
                      color: NEON,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(var(--c-neon-rgb), 0.2)`; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>chevron_right</span>
                  </button>
                </div>}
              </div>
            </GlowBox>

            {/* Thumbnails — only shown when there are multiple images */}
            {thumbnails.length > 1 && <div className="hide-scrollbar" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {thumbnails.map((src, i) => (
                <div
                  key={i}
                  onClick={() => switchImage(src)}
                  className="hover-glow"
                  style={{
                    width: '8rem',
                    aspectRatio: '1',
                    borderRadius: '1rem',
                    border: `2px solid ${src === mainImage ? NEON : 'rgba(var(--c-text-rgb), 0.05)'}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: 'pointer',
                    background: 'var(--c-product-img)',
                    transition: 'border-color 0.2s ease, filter 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (src !== mainImage) (e.currentTarget as HTMLDivElement).style.borderColor = `${NEON}80` }}
                  onMouseLeave={(e) => { if (src !== mainImage) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.05)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`View ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                </div>
              ))}
            </div>}
          </div>

          {/* ── Right: Product Info Card ── */}
          <div style={{ gridColumn: 'span 4', position: 'sticky', top: '8rem' }}>
            <GlowBox style={{ padding: '2.5rem', borderRadius: '1.5rem' }}>

              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' as const }}>
                {(product?.category_id || product?.categoryId) && (
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', background: `rgba(${NEON_RGB}, 0.13)`, color: NEON, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, fontFamily: 'Space Grotesk, sans-serif' }}>
                    {(product?.category_id || product?.categoryId).replace(/-/g, ' ')}
                  </span>
                )}
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', background: inStock ? `rgba(var(--c-neon-rgb), 0.1)` : 'rgba(var(--c-text-rgb), 0.05)', color: inStock ? NEON : 'rgba(var(--c-text-rgb), 0.4)', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>
                  {inStock ? `IN STOCK — ${stockQty} units` : 'OUT OF STOCK'}
                </span>
              </div>

              {/* Title */}
              <h1 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1rem' }}>
                {product?.name || 'UNKNOWN ENTITY'}
              </h1>

              {/* Rating */}
              {(() => {
                const { avg, totalCount } = ratingStats
                const hasRating = avg != null && avg > 0
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                    <button
                      onClick={scrollToComments}
                      title="View reviews"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {[1, 2, 3, 4, 5].map((s) => {
                        const filled = hasRating && s <= Math.round(avg!)
                        return (
                          <span key={s} className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0", color: filled ? NEON : 'rgba(var(--c-text-rgb), 0.35)' }}>star</span>
                        )
                      })}
                      <span style={{ fontSize: '1rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginLeft: '0.5rem', color: hasRating ? NEON : 'rgba(var(--c-text-rgb), 0.3)' }}>
                        {hasRating ? avg!.toFixed(1) : 'N/A'}
                      </span>
                    </button>
                    <span style={{ color: 'rgba(var(--c-text-rgb), 0.4)', fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.2em', borderLeft: '1px solid rgba(var(--c-text-rgb), 0.1)', paddingLeft: '1.5rem' }}>
                      {totalCount > 0 ? `${totalCount} REVIEW${totalCount !== 1 ? 'S' : ''}` : 'NO RATINGS YET'}
                    </span>
                  </div>
                )
              })()}

              {/* Price */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '3.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--c-text)' }}>
                    ${Math.floor(product?.price || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1.5rem', color: 'rgba(var(--c-text-rgb), 0.4)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    .{((product?.price || 0) % 1).toFixed(2).substring(2)}
                  </span>
                </div>
              </div>

              {/* Qty selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(var(--c-text-rgb), 0.4)', letterSpacing: '0.2em', fontFamily: 'Space Grotesk, sans-serif' }}>QTY</span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(var(--c-text-rgb), 0.1)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <button
                    className="qty-btn"
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', cursor: qty <= 1 ? 'not-allowed' : 'pointer', color: qty <= 1 ? 'rgba(var(--c-text-rgb), 0.2)' : 'rgba(var(--c-text-rgb), 0.7)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >−</button>
                  <span style={{ minWidth: '2.5rem', textAlign: 'center', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--c-text)' }}>{qty}</span>
                  <button
                    className="qty-btn"
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', cursor: qty >= stockQty ? 'not-allowed' : 'pointer', color: qty >= stockQty ? 'rgba(var(--c-text-rgb), 0.2)' : 'rgba(var(--c-text-rgb), 0.7)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setQty(q => Math.min(stockQty, q + 1))}
                    disabled={qty >= stockQty}
                  >+</button>
                </div>
                {stockQty > 0 && (
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.15em' }}>{stockQty} IN STOCK</span>
                )}
              </div>

              {/* CTA */}
              <button
                disabled={!inStock || cartStatus === 'loading'}
                onClick={async () => {
                  setCartStatus('loading')
                  setCartError('')
                  try {
                    if (user) {
                      await cartService.addItem({ product_id: id, quantity: qty })
                    } else {
                      // Guest cart — persist to localStorage
                      const GUEST_CART_KEY = 'lumen_guest_cart'
                      const existing = (() => { try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]') } catch { return [] } })()
                      const idx = existing.findIndex((i: any) => i.id === id)
                      if (idx >= 0) {
                        existing[idx].quantity = Math.min(existing[idx].quantity + qty, stockQty)
                      } else {
                        existing.push({
                          id,
                          name: product?.name || '',
                          price: product?.price || 0,
                          quantity: qty,
                          image: (product as any)?.all_images?.[0] || (product as any)?.image_url || '',
                          description: product?.description || '',
                        })
                      }
                      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(existing))
                    }
                    setCartStatus('success')
                    setTimeout(() => router.push('/cart'), 800)
                  } catch (err: any) {
                    setCartError(err.message || 'Failed to add to cart')
                    setCartStatus('error')
                    setTimeout(() => setCartStatus('idle'), 3000)
                  }
                }}
                style={{
                  width: '100%',
                  background: cartStatus === 'success' ? '#22c55e' : cartStatus === 'error' ? '#ef4444' : inStock ? NEON : 'rgba(var(--c-text-rgb), 0.08)',
                  color: cartStatus === 'error' ? '#fff' : '#000',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700,
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  fontSize: '0.875rem',
                  letterSpacing: '0.3em',
                  border: 'none',
                  cursor: !inStock || cartStatus === 'loading' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginBottom: cartStatus === 'error' ? '0.75rem' : '2rem',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease, background 0.3s ease',
                  opacity: !inStock ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!inStock || cartStatus !== 'idle') return
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 40px rgba(var(--c-neon-rgb), 0.35)`
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                }}
                onMouseDown={(e) => { if (inStock && cartStatus === 'idle') (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
              >
                {cartStatus === 'loading' && <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>}
                {cartStatus === 'success' && <span className="material-symbols-outlined">check_circle</span>}
                {cartStatus === 'error' && <span className="material-symbols-outlined">error</span>}
                {cartStatus === 'idle' && <span className="material-symbols-outlined">shopping_cart</span>}
                {cartStatus === 'loading' ? 'ADDING...' : cartStatus === 'success' ? 'ADDED TO CART!' : cartStatus === 'error' ? 'FAILED' : inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
              </button>
              {cartStatus === 'error' && cartError && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '2rem', textAlign: 'center' }}>{cartError}</p>
              )}

              {/* Secondary actions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', paddingTop: '2rem', borderTop: '1px solid rgba(var(--c-text-rgb), 0.05)' }}>
                {[
                  { icon: 'favorite', label: isSaved(id) ? 'SAVED' : 'SAVE', onClick: () => { if (!user) { router.push('/login'); return; } toggleWishlist(id) } },
                  { icon: copied ? 'check_circle' : 'share', label: copied ? 'COPIED!' : 'SHARE', onClick: () => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000) } },
                ].map((action, i) => {
                  const isSaveBtn = action.icon === 'favorite'
                  const saved = isSaveBtn && isSaved(id)
                  return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: saved ? '#ff4d6d' : 'rgba(var(--c-text-rgb), 0.4)',
                      background: 'none',
                      border: 'none',
                      borderLeft: i === 1 ? '1px solid rgba(var(--c-text-rgb), 0.05)' : 'none',
                      borderRight: 'none',
                      cursor: 'pointer',
                      padding: '0.75rem 0.5rem',
                      transition: 'color 0.2s ease, transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!saved) (e.currentTarget as HTMLButtonElement).style.color = NEON
                      ;(e.currentTarget as HTMLButtonElement).querySelector('.material-symbols-outlined')?.setAttribute('style', `font-size: 1.5rem; transform: scale(1.25); transition: transform 0.2s; color: ${saved ? '#ff4d6d' : NEON}; font-variation-settings: ${saved ? "'FILL' 1" : "'FILL' 0"}`)
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.color = saved ? '#ff4d6d' : 'rgba(var(--c-text-rgb), 0.4)'
                      ;(e.currentTarget as HTMLButtonElement).querySelector('.material-symbols-outlined')?.setAttribute('style', `font-size: 1.5rem; transform: scale(1); transition: transform 0.2s; font-variation-settings: ${saved ? "'FILL' 1" : "'FILL' 0"}`)
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', transition: 'transform 0.2s', fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0", color: saved ? '#ff4d6d' : undefined }}>{action.icon}</span>
                    <span style={{ fontSize: '0.5625rem', textTransform: 'uppercase' as const, fontWeight: 700, letterSpacing: '0.2em' }}>{action.label}</span>
                  </button>
                  )
                })}
              </div>
            </GlowBox>
          </div>
        </div>

        {/* ── Tabs Section ── */}
        <section style={{ marginTop: '5rem' }}>
          {/* Tab triggers */}
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '3rem', borderBottom: '1px solid rgba(var(--c-text-rgb), 0.05)', marginBottom: '3rem', overflowX: 'auto', paddingLeft: '1rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  paddingBottom: '1.5rem',
                  paddingTop: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Space Grotesk, sans-serif',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase' as const,
                  color: activeTab === tab.id ? NEON : 'rgba(var(--c-text-rgb), 0.4)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? NEON : 'transparent'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap' as const,
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.7)' }}
                onMouseLeave={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.4)' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <GlowBox style={{ padding: '3rem', borderRadius: '1.5rem', minHeight: '400px' }}>

            {/* Description */}
            {activeTab === 'desc' && (
              <div style={{ maxWidth: '56rem' }}>
                {product?.description ? (
                  <p style={{ fontSize: '1.125rem', color: 'rgba(var(--c-text-rgb), 0.7)', lineHeight: 1.85, fontWeight: 300, whiteSpace: 'pre-line' }}>
                    {product.description}
                  </p>
                ) : (
                  <p style={{ color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.875rem' }}>
                    NO DESCRIPTION AVAILABLE
                  </p>
                )}
              </div>
            )}

            {/* Specs */}
            {activeTab === 'specs' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3rem 5rem' }}>
                {[
                  { label: 'PRODUCT ID', value: product?.id || 'N/A' },
                  { label: 'MODEL', value: product?.model || 'N/A' },
                  { label: 'SERIAL NUMBER', value: product?.serial_number || product?.serialNumber || 'N/A' },
                  { label: 'CATEGORY', value: (product?.category_id || product?.categoryId || 'N/A').replace(/-/g, ' ').toUpperCase() },
                  { label: 'PRICE', value: `$${(product?.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: 'STOCK QUANTITY', value: `${stockQty} units` },
                  { label: 'WARRANTY', value: product?.warranty || 'N/A' },
                  { label: 'DISTRIBUTOR', value: product?.distributor || 'N/A' },
                  { label: 'AVAILABILITY', value: inStock ? 'IN STOCK' : 'OUT OF STOCK' },
                ].map((spec) => (
                  <div key={spec.label}>
                    <p style={{ fontSize: '0.75rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em', marginBottom: '0.5rem', fontWeight: 700 }}>{spec.label}</p>
                    <p style={{ fontSize: '1rem', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--c-text)', fontWeight: 300, wordBreak: 'break-all' as const }}>{spec.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div ref={commentsRef}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap' as const, gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>USER REVIEWS</h3>
                  {reviewsReady && !myReview && (
                    <button
                      onClick={() => {
                        if (!user) { router.push('/login'); return; }
                        setNewReview({ rating: 5, comment: '' })
                        setIsEditMode(false)
                        setReviewError('')
                        setShowReviewForm(v => !v)
                      }}
                      style={{ padding: '0.5rem 1.5rem', border: `1px solid ${NEON}4D`, color: NEON, fontSize: '0.75rem', letterSpacing: '0.2em', background: showReviewForm ? `rgba(${NEON_RGB}, 0.10)` : 'none', cursor: 'pointer', borderRadius: '0.25rem', transition: 'background 0.2s ease' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `rgba(${NEON_RGB}, 0.10)`)}
                      onMouseLeave={(e) => { if (!showReviewForm) (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                    >
                      {showReviewForm ? 'CANCEL' : 'WRITE A REVIEW'}
                    </button>
                  )}
                </div>

                {/* Success Message */}
                {reviewSuccess && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', background: `rgba(var(--c-neon-rgb), 0.08)`, border: `1px solid ${NEON}40`, borderRadius: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ color: NEON, fontSize: '1.25rem' }}>check_circle</span>
                    <span style={{ color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.8rem', letterSpacing: '0.15em' }}>{reviewSuccessMsg}</span>
                  </div>
                )}

                {/* Write Review Form */}
                {showReviewForm && (
                  <div style={{ marginBottom: '2rem', padding: '1.5rem', background: `rgba(${NEON_RGB}, 0.03)`, border: `1px solid ${NEON}22`, borderRadius: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: `rgba(var(--c-neon-rgb), 0.05)`, border: `1px solid rgba(var(--c-neon-rgb), 0.15)`, borderRadius: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: NEON }}>account_circle</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(var(--c-text-rgb), 0.4)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em' }}>POSTING AS</span>
                      <span style={{ fontSize: '0.75rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.1em' }}>
                        {(user?.first_name && user?.last_name)
                          ? `${user.first_name} ${user.last_name}`.toUpperCase()
                          : user?.first_name?.toUpperCase() || user?.email?.split('@')[0]?.toUpperCase() || 'ANONYMOUS'}
                      </span>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'rgba(var(--c-text-rgb), 0.4)', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '0.4rem' }}>RATING</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => setNewReview(r => ({ ...r, rating: s }))} onMouseEnter={() => setHoverStar(s)} onMouseLeave={() => setHoverStar(0)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: s <= (hoverStar || newReview.rating) ? NEON : 'rgba(var(--c-text-rgb), 0.30)', fontVariationSettings: s <= (hoverStar || newReview.rating) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                          </button>
                        ))}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'rgba(var(--c-text-rgb), 0.5)', fontFamily: 'Space Grotesk, sans-serif' }}>
                          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][hoverStar || newReview.rating]}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'rgba(var(--c-text-rgb), 0.4)', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '0.4rem' }}>
                        YOUR COMMENT <span style={{ color: 'rgba(var(--c-text-rgb), 0.25)', fontWeight: 400 }}>(OPTIONAL)</span> <span style={{ color: newReview.comment.length > 580 ? 'red' : 'rgba(var(--c-text-rgb), 0.3)' }}>({newReview.comment.length}/600)</span>
                      </label>
                      <textarea
                        value={newReview.comment}
                        onChange={(e) => setNewReview(r => ({ ...r, comment: e.target.value.slice(0, 600) }))}
                        placeholder="Share your experience..."
                        rows={4}
                        style={{ width: '100%', background: 'rgba(var(--c-text-rgb), 0.04)', border: '1px solid rgba(var(--c-text-rgb), 0.1)', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: 'var(--c-text)', fontSize: '0.875rem', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
                      />
                    </div>
                    {reviewError && (
                      <span style={{ color: 'red', fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.8rem' }}>{reviewError}</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        onClick={submitReview}
                        disabled={reviewSubmitting}
                        style={{ padding: '0.75rem 2rem', background: !reviewSubmitting ? NEON : 'rgba(var(--c-text-rgb), 0.1)', color: '#000', border: 'none', borderRadius: '0.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', cursor: !reviewSubmitting ? 'pointer' : 'not-allowed' }}
                      >
                        {reviewSubmitting ? 'SUBMITTING...' : isEditMode ? 'UPDATE REVIEW' : 'SUBMIT REVIEW'}
                      </button>
                      {isEditMode && (
                        <button
                          onClick={() => { setShowReviewForm(false); setIsEditMode(false); setReviewError('') }}
                          disabled={reviewSubmitting}
                          style={{ padding: '0.75rem 1.5rem', background: 'none', color: 'rgba(var(--c-text-rgb), 0.45)', border: '1px solid rgba(var(--c-text-rgb), 0.15)', borderRadius: '0.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', cursor: reviewSubmitting ? 'not-allowed' : 'pointer', transition: 'color 0.2s, border-color 0.2s' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.35)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.45)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.15)' }}
                        >
                          CANCEL
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Star Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' as const }}>
                  {([0, 5, 4, 3, 2, 1] as const).map((f) => {
                    const cnt = starCounts[f] ?? 0
                    const isActive = reviewFilter === f
                    return (
                      <button key={f} onClick={() => setReviewFilter(f)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.9rem', borderRadius: '9999px', border: `1px solid ${isActive ? NEON : 'rgba(var(--c-text-rgb), 0.1)'}`, background: isActive ? `rgba(${NEON_RGB}, 0.09)` : 'transparent', color: isActive ? NEON : 'rgba(var(--c-text-rgb), 0.45)', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                        {f === 0 ? <>ALL <span style={{ opacity: 0.6 }}>({cnt})</span></> : <>{f} <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', fontVariationSettings: "'FILL' 1" }}>star</span> <span style={{ opacity: 0.6 }}>({cnt})</span></>}
                      </button>
                    )
                  })}
                </div>

                {/* Sort Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' as const }}>
                  {([['default', 'DEFAULT', ''], ['most_liked', 'MOST LIKED', 'thumb_up'], ['most_disliked', 'MOST DISLIKED', 'thumb_down']] as const).map(([val, label, icon]) => (
                    <button key={val} onClick={() => setReviewSort(val)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.85rem', borderRadius: '9999px', border: `1px solid ${reviewSort === val ? NEON : 'rgba(var(--c-text-rgb), 0.1)'}`, background: reviewSort === val ? `rgba(${NEON_RGB}, 0.09)` : 'transparent', color: reviewSort === val ? NEON : 'rgba(var(--c-text-rgb), 0.45)', fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                      {icon && <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>{icon}</span>}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Review Cards */}
                {filteredReviews.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                    {filteredReviews.map((review: any, idx: number) => {
                      const rid = review.id || review.user_id || String(idx)
                      const votes = reviewVotes.get(rid) || { likes: 0, dislikes: 0, voted: null }
                      return (
                        <ReviewCard
                          key={rid}
                          user={review.username || review.user_id || 'ANONYMOUS'}
                          text={review.comment || review.text || ''}
                          rating={review.rating}
                          likes={votes.likes}
                          dislikes={votes.dislikes}
                          voted={votes.voted}
                          onVote={(type) => handleVote(rid, type)}
                          pending={review.status === 'pending'}
                          rejected={review.status === 'rejected'}
                          onEdit={myReview?.id === rid ? () => {
                            setNewReview({ rating: myReview!.rating, comment: myReview!.comment })
                            setIsEditMode(true)
                            setReviewError('')
                            setShowReviewForm(true)
                            setTimeout(() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
                          } : undefined}
                          onDelete={myReview?.id === rid ? handleDeleteReview : undefined}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'rgba(var(--c-text-rgb), 0.1)' }}>rate_review</span>
                    <p style={{ color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.875rem' }}>
                      {reviewFilter === 0 ? 'NO REVIEWS YET' : `NO ${reviewFilter}★ REVIEWS`}
                    </p>
                    {reviewFilter === 0 && <p style={{ color: 'rgba(var(--c-text-rgb), 0.2)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>Be the first to review this product</p>}
                  </div>
                )}
              </div>
            )}

            {/* Returns */}
            {activeTab === 'returns' && (
              <div style={{ maxWidth: '42rem' }}>
                <h3 style={{ fontSize: '1.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: NEON, marginBottom: '1.5rem' }}>
                  WARRANTY &amp; RETURN POLICY
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: 0, listStyle: 'none' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '1.125rem', color: 'rgba(var(--c-text-rgb), 0.7)', fontWeight: 300 }}>
                    <span className="material-symbols-outlined" style={{ color: NEON, flexShrink: 0 }}>shield</span>
                    <span>
                      <strong style={{ color: 'var(--c-text)', fontFamily: 'Space Grotesk, sans-serif' }}>Warranty: </strong>
                      {product?.warranty || 'No warranty information available.'}
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '1.125rem', color: 'rgba(var(--c-text-rgb), 0.7)', fontWeight: 300 }}>
                    <span className="material-symbols-outlined" style={{ color: NEON, flexShrink: 0 }}>verified</span>
                    <span>30-day return policy from date of purchase.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '1.125rem', color: 'rgba(var(--c-text-rgb), 0.7)', fontWeight: 300 }}>
                    <span className="material-symbols-outlined" style={{ color: NEON, flexShrink: 0 }}>support_agent</span>
                    <span>Contact support for return authorisation and shipping details.</span>
                  </li>
                </ul>
              </div>
            )}
          </GlowBox>
        </section>

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
        <section style={{ marginTop: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.38em', fontWeight: 700, color: NEON, fontFamily: 'Space Grotesk, sans-serif', marginBottom: '0.4rem', opacity: 0.85 }}>FROM SAME CATEGORY</p>
              <h2 style={{ fontSize: '1.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--c-text)', margin: 0 }}>
                You May Also Like
              </h2>
            </div>
            <button
              onClick={() => router.push('/browse')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid rgba(var(--c-text-rgb), 0.12)', borderRadius: '9999px', color: 'rgba(var(--c-text-rgb), 0.55)', padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, transition: 'border-color 0.2s, color 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${NEON_RGB}, 0.38)`; (e.currentTarget as HTMLButtonElement).style.color = NEON }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.55)' }}
            >
              Browse All
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>arrow_forward</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            {relatedProducts.slice(0, showCatalogue ? 8 : 4).map((p) => (
              <RelatedCard key={p.id} product={p} onClick={() => router.push(`/product/${p.id}`)} />
            ))}
          </div>

          {!showCatalogue && relatedProducts.length > 4 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
              <button
                onClick={() => setShowCatalogue(true)}
                style={{ padding: '0.75rem 3rem', border: '1px solid rgba(var(--c-text-rgb), 0.1)', borderRadius: '9999px', fontSize: '0.72rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em', color: 'rgba(var(--c-text-rgb), 0.55)', background: 'none', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${NEON_RGB}, 0.38)`; (e.currentTarget as HTMLButtonElement).style.color = NEON }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.55)' }}
              >
                SHOW MORE
              </button>
            </div>
          )}
        </section>
        )}
      </main>

      
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className="hover-glow"
      style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(var(--c-text-rgb), 0.02)', border: '1px solid rgba(var(--c-text-rgb), 0.05)', transition: 'border-color 0.2s' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(var(--c-neon-rgb), 0.2)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.05)')}
    >
      <span className="material-symbols-outlined" style={{ color: 'var(--c-neon)', marginBottom: '1rem', fontSize: '1.875rem', display: 'block' }}>{icon}</span>
      <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h4>
      <p style={{ fontSize: '0.875rem', color: 'rgba(var(--c-text-rgb), 0.5)' }}>{desc}</p>
    </div>
  )
}

const ReviewCard = memo(function ReviewCard({ user, text, rating, likes, dislikes, voted, onVote, pending, rejected, onEdit, onDelete }: { user: string; text: string; rating?: number; likes: number; dislikes: number; voted: 'like'|'dislike'|null; onVote: (type: 'like'|'dislike') => void; pending?: boolean; rejected?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const TRUNCATE = 120
  const isLong = text.length > TRUNCATE
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }
  const initials = user.slice(0, 2).toUpperCase()

  return (
    <div ref={ref} onMouseMove={rejected ? undefined : handleMouseMove} className={rejected ? undefined : 'hover-glow'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: '1.75rem', background: rejected ? 'rgba(var(--c-text-rgb), 0.01)' : 'rgba(var(--c-text-rgb), 0.025)', borderRadius: '1rem', border: `1px solid ${rejected ? 'rgba(239,68,68,0.2)' : 'rgba(var(--c-text-rgb), 0.07)'}`, borderLeft: rejected ? '3px solid rgba(239,68,68,0.45)' : undefined, opacity: rejected ? (hovered ? 1 : 0.45) : 1, filter: rejected ? (hovered ? 'none' : 'grayscale(0.7)') : 'none', transition: 'opacity 0.2s, filter 0.2s', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: rejected ? 'rgba(var(--c-text-rgb), 0.05)' : `rgba(${NEON_RGB}, 0.08)`, border: `1px solid ${rejected ? 'rgba(var(--c-text-rgb), 0.08)' : `rgba(${NEON_RGB}, 0.16)`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: rejected ? 'rgba(var(--c-text-rgb), 0.25)' : NEON }}>{initials}</span>
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: rejected ? 'rgba(var(--c-text-rgb), 0.3)' : '#e5e2e1', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.2 }}>{user}</p>
            <p style={{ fontSize: '0.6rem', color: 'rgba(var(--c-text-rgb), 0.28)', letterSpacing: '0.12em', fontFamily: 'Space Grotesk, sans-serif', marginTop: '0.1rem' }}>VERIFIED PURCHASE</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
          {pending && <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.15em', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: '0.25rem', padding: '0.15rem 0.5rem', background: '#f59e0b0d' }}>PENDING</span>}
          {rejected && <span style={{ fontSize: '0.58rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.15em', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.25rem', padding: '0.15rem 0.5rem', background: 'rgba(239,68,68,0.07)' }}>REJECTED</span>}
          <div style={{ display: 'flex', gap: '0.1rem' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: rejected ? 'rgba(var(--c-text-rgb), 0.18)' : NEON, fontVariationSettings: rating != null && s <= rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
            ))}
          </div>
          {(onEdit || onDelete) && (
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
              {onEdit && (
                <button
                  onClick={onEdit}
                  title="Edit review"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'rgba(var(--c-text-rgb), 0.35)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = NEON)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.35)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>edit</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  title="Delete review"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'rgba(var(--c-text-rgb), 0.35)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.35)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comment */}
      {text ? (
        <div>
          <p style={{ fontSize: '0.875rem', color: rejected ? 'rgba(var(--c-text-rgb), 0.28)' : 'rgba(var(--c-text-rgb), 0.65)', lineHeight: 1.7, marginBottom: isLong ? '0.5rem' : 0 }}>
            {isLong && !expanded ? text.slice(0, TRUNCATE) + '…' : text}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', color: rejected ? 'rgba(var(--c-text-rgb), 0.25)' : NEON, fontSize: '0.68rem', cursor: 'pointer', padding: 0, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.12em', opacity: 0.8 }}>
              {expanded ? 'SHOW LESS ↑' : 'READ MORE ↓'}
            </button>
          )}
        </div>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'rgba(var(--c-text-rgb), 0.2)', fontStyle: 'italic' }}>No comment left.</p>
      )}

      {/* Votes */}
      {!rejected && (
        <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid rgba(var(--c-text-rgb), 0.06)', paddingTop: '0.85rem' }}>
          <button onClick={() => onVote('like')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: voted === 'like' ? `rgba(${NEON_RGB}, 0.05)` : 'none', border: `1px solid ${voted === 'like' ? `rgba(${NEON_RGB}, 0.33)` : 'rgba(var(--c-text-rgb), 0.08)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.75rem', color: voted === 'like' ? NEON : 'rgba(var(--c-text-rgb), 0.3)', fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: voted === 'like' ? "'FILL' 1" : "'FILL' 0" }}>thumb_up</span>
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button onClick={() => onVote('dislike')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: voted === 'dislike' ? 'rgba(255,68,68,0.07)' : 'none', border: `1px solid ${voted === 'dislike' ? 'rgba(255,68,68,0.45)' : 'rgba(var(--c-text-rgb), 0.08)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.75rem', color: voted === 'dislike' ? '#ff5555' : 'rgba(var(--c-text-rgb), 0.3)', fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: voted === 'dislike' ? "'FILL' 1" : "'FILL' 0" }}>thumb_down</span>
            {dislikes > 0 && <span>{dislikes}</span>}
          </button>
        </div>
      )}
    </div>
  )
})

const RelatedCard = memo(function RelatedCard({ product, onClick }: { product: any; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }
  const imgSrc = product.all_images?.[0] || product.image_url || product.imageUrl
  const cat = (product.category_id || product.categoryId || 'PRODUCT').replace(/-/g, ' ').toUpperCase()
  const ratingAvg = product.rating_count > 0 ? (product.rating_sum / product.rating_count) : null

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="hover-glow grounded-box"
      style={{
        borderRadius: '1.25rem',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 20px 40px rgba(0,0,0,0.45), 0 0 0 1px ${NEON}18` : '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '4/3', position: 'relative', background: 'rgba(var(--c-text-rgb), 0.025)', overflow: 'hidden', flexShrink: 0 }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={product.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem', transition: 'transform 0.6s ease', transform: hovered ? 'scale(1.07)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'rgba(var(--c-text-rgb), 0.07)' }}>image_not_supported</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: '1rem 1.125rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
        <p style={{ fontSize: '0.58rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.28em', opacity: 0.8 }}>{cat}</p>
        <h3 style={{ fontSize: '0.9rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 'calc(0.9rem * 1.35 * 2)' }}>
          {product.name}
        </h3>
        {ratingAvg != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: s <= Math.round(ratingAvg) ? NEON : 'rgba(var(--c-text-rgb), 0.30)', fontVariationSettings: s <= Math.round(ratingAvg) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
            ))}
            <span style={{ fontSize: '0.68rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, marginLeft: '0.2rem' }}>{ratingAvg.toFixed(1)}</span>
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid rgba(var(--c-text-rgb), 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.05rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: 'var(--c-text)' }}>
            ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', border: `1px solid ${hovered ? NEON : `${NEON}33`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hovered ? NEON : 'transparent', transition: 'all 0.2s ease' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.95rem', color: hovered ? '#000' : NEON, transition: 'color 0.2s' }}>arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  )
})
