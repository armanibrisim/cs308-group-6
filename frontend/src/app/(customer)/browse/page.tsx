'use client'

import { useEffect, useRef, useState, MouseEvent, memo, useReducer } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { productService } from '../../../services/productService'
import { SideNav } from '../../../components/layout/SideNav'
import { useCategories } from '../../../context/CategoryContext'
import { useWishlist } from '../../../context/WishlistContext'
import { useAuth } from '../../../context/AuthContext'

const NEON = 'var(--c-neon)'
const NEON_RGB = 'var(--c-neon-rgb)'

const SORT_OPTIONS = [
  { label: 'NEWEST',            sortBy: 'newest',     sortOrder: 'desc' },
  { label: 'MOST POPULAR',      sortBy: 'popularity', sortOrder: 'desc' },
  { label: 'TOP RATED',         sortBy: 'avg_rating', sortOrder: 'desc' },
  { label: 'PRICE: LOW→HIGH',   sortBy: 'price',      sortOrder: 'asc'  },
  { label: 'PRICE: HIGH→LOW',   sortBy: 'price',      sortOrder: 'desc' },
  { label: 'NAME: A→Z',         sortBy: 'name',       sortOrder: 'asc'  },
  { label: 'NAME: Z→A',         sortBy: 'name',       sortOrder: 'desc' },
]

const PAGE_SIZE = 20

// ── GlowBox ──────────────────────────────────────────────────────────────────
function GlowBox({ children, className = '', style, onClick }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`)
  }
  return (
    <div ref={ref} onMouseMove={handleMouseMove} onClick={onClick}
      className={`hover-glow grounded-box ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────
const ProductCard = memo(function ProductCard({ product, onClick, saved, onHeartClick }: { product: any; onClick: () => void; saved?: boolean; onHeartClick?: (e: MouseEvent) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`)
  }
  const img = product.image_url || product.imageUrl
  const inStock = (product.stock_quantity ?? product.stockQuantity ?? 0) > 0

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="hover-glow grounded-box"
      style={{ borderRadius: '1.5rem', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
    >
      {/* Image */}
      <div className="product-img-box" style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img} alt={product.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.7s ease, filter 0.3s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)', filter: inStock ? 'none' : 'grayscale(80%) brightness(0.6)' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: `rgba(${NEON_RGB}, 0.08)` }}>image_not_supported</span>
          </div>
        )}
        {/* Wishlist heart */}
        {onHeartClick && (
          <button
            onClick={onHeartClick}
            title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', zIndex: 10, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.15s, background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: saved ? '#ff4d6d' : 'rgba(255,255,255,0.6)', fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0", transition: 'color 0.2s' }}>favorite</span>
          </button>
        )}
        {/* Out of stock overlay */}
        {!inStock && (
          <div className="oos-overlay" style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined oos-icon" style={{ fontSize: '2.2rem' }}>remove_shopping_cart</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
              <span className="oos-label" style={{ fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase' }}>OUT OF STOCK</span>
              <div className="oos-line" style={{ width: '100%', height: '2px', borderRadius: '2px' }} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <p style={{ fontSize: '0.6rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          {product.category_id || product.categoryId || 'PRODUCT'}
        </p>
        <h3 style={{ fontSize: '1rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {product.name}
        </h3>
        {(() => {
          const avg: number | null = product.average_rating ?? product.avg_rating ?? null
          const count: number = product.review_count ?? 0
          const hasRating = avg != null && avg > 0
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '0.875rem',
                    color: hasRating && s <= Math.round(avg!) ? NEON : 'rgba(var(--c-text-rgb), 0.35)',
                    fontVariationSettings: hasRating && s <= Math.round(avg!) ? "'FILL' 1" : "'FILL' 0",
                  }}
                >star</span>
              ))}
              <span style={{ fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: hasRating ? NEON : 'rgba(var(--c-text-rgb), 0.40)', marginLeft: '0.125rem' }}>
                {hasRating ? avg!.toFixed(1) : 'N/A'}
              </span>
              {count > 0 && (
                <span style={{ fontSize: '0.625rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.1em' }}>
                  ({count})
                </span>
              )}
            </div>
          )
        })()}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.25rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: 'var(--c-text)' }}>
            ${(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div style={{
            width: '2.25rem', height: '2.25rem', borderRadius: '50%',
            border: hovered ? `1px solid ${NEON}` : `1px solid rgba(${NEON_RGB}, 0.30)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered ? NEON : 'transparent',
            transition: 'background 0.2s, color 0.2s',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: hovered ? '#000' : NEON, transition: 'color 0.2s' }}>arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  )
})

// ── Products reducer ──────────────────────────────────────────────────────────
type ProductsAction =
  | { type: 'SET'; products: any[]; total: number }
  | { type: 'APPEND'; products: any[] }

function productsReducer(
  state: { items: any[]; total: number },
  action: ProductsAction
) {
  if (action.type === 'SET') return { items: action.products, total: action.total }
  return { items: [...state.items, ...action.products], total: state.total }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BrowsePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { isSaved, toggle } = useWishlist()

  const [{ items: products, total }, dispatchProducts] = useReducer(productsReducer, { items: [], total: 0 })
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [search, setSearch]         = useState(searchParams.get('search') || '')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '')

  const selectCategory = (id: string) => {
    setCategoryId(id)
    const url = id ? `/browse?category_id=${encodeURIComponent(id)}` : '/browse'
    router.replace(url, { scroll: false })
  }
  const { categories } = useCategories()
  const [sortIdx, setSortIdx]         = useState(0)
  const [sortOpen, setSortOpen]       = useState(false)
  const sortCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [catOpen, setCatOpen]         = useState(false)
  const catCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCategoryId(searchParams.get('category_id') || '')
    const s = searchParams.get('search') || ''
    setSearch(s)
    setSearchInput(s)
  }, [searchParams])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    const sort = SORT_OPTIONS[sortIdx]
    productService.getProducts({
      search:     search || undefined,
      categoryId: categoryId || undefined,
      sortBy:     sort.sortBy as any,
      sortOrder:  sort.sortOrder as any,
      page: 1,
      limit: PAGE_SIZE,
    }).then(res => {
      dispatchProducts({ type: 'SET', products: res.products, total: res.total })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [search, categoryId, sortIdx])

  const loadMore = () => {
    const nextPage = page + 1
    setLoadingMore(true)
    const sort = SORT_OPTIONS[sortIdx]
    productService.getProducts({
      search:     search || undefined,
      categoryId: categoryId || undefined,
      sortBy:     sort.sortBy as any,
      sortOrder:  sort.sortOrder as any,
      page: nextPage,
      limit: PAGE_SIZE,
    }).then(res => {
      dispatchProducts({ type: 'APPEND', products: res.products })
      setPage(nextPage)
    }).catch(() => {}).finally(() => setLoadingMore(false))
  }

  const hasMore = products.length < total

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)' }}>
      <SideNav />
      <main style={{ paddingTop: '0', paddingBottom: '6rem', paddingLeft: '9rem', paddingRight: '4rem' }}>

        {/* ── Page header ── */}
        <div style={{ paddingTop: '3rem', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.35em', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>CATALOG</p>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--c-text)' }}>
            All Products
          </h1>
          {total > 0 && !loading && (
            <p style={{ color: 'rgba(var(--c-text-rgb), 0.3)', fontSize: '0.78rem', marginTop: '0.4rem', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
              {total} products available
            </p>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2.5rem' }}>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '420px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: `rgba(${NEON_RGB}, 0.50)`, fontSize: '1.25rem', pointerEvents: 'none' }}>search</span>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(e as any)}
              placeholder="SEARCH PRODUCTS..."
              style={{
                width: '100%', background: 'rgba(var(--c-text-rgb), 0.04)', border: '1px solid rgba(var(--c-text-rgb), 0.08)',
                borderRadius: '9999px', padding: '0.75rem 1rem 0.75rem 3rem',
                fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                color: 'var(--c-text)', outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = `rgba(${NEON_RGB}, 0.31)`)}
              onBlur={e => (e.currentTarget.style.borderColor = `rgba(var(--c-text-rgb), 0.08)`)}
            />
          </form>

          {/* Sort dropdown */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => { if (sortCloseTimer.current) clearTimeout(sortCloseTimer.current); setSortOpen(true) }}
            onMouseLeave={() => { sortCloseTimer.current = setTimeout(() => setSortOpen(false), 300) }}
          >
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(var(--c-text-rgb), 0.04)', border: `1px solid ${sortOpen ? `rgba(${NEON_RGB}, 0.31)` : 'rgba(var(--c-text-rgb), 0.08)'}`,
                borderRadius: '9999px', padding: '0.75rem 1.25rem',
                fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                color: 'var(--c-text)', cursor: 'pointer', transition: 'border-color 0.2s', whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: NEON }}>sort</span>
              {SORT_OPTIONS[sortIdx].label}
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', transition: 'transform 0.2s', transform: sortOpen ? 'rotate(180deg)' : 'none' }}>keyboard_arrow_down</span>
            </button>
            {sortOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, minWidth: '220px',
                background: 'var(--c-panel)', backdropFilter: 'blur(24px)',
                border: '1px solid rgba(var(--c-text-rgb), 0.08)', borderRadius: '1rem',
                overflow: 'hidden', zIndex: 50,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}>
                {SORT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => { setSortIdx(i); setSortOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.875rem 1.25rem',
                      fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                      color: i === sortIdx ? NEON : 'rgba(var(--c-text-rgb), 0.6)',
                      background: i === sortIdx ? `rgba(${NEON_RGB}, 0.06)` : 'none',
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (i !== sortIdx) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--c-text-rgb), 0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text)' } }}
                    onMouseLeave={e => { if (i !== sortIdx) { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.6)' } }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category dropdown */}
          {categories.length > 0 && (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => { if (catCloseTimer.current) clearTimeout(catCloseTimer.current); setCatOpen(true) }}
              onMouseLeave={() => { catCloseTimer.current = setTimeout(() => setCatOpen(false), 300) }}
            >
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: categoryId ? `rgba(${NEON_RGB}, 0.08)` : 'rgba(var(--c-text-rgb), 0.04)',
                  border: `1px solid ${categoryId ? `rgba(${NEON_RGB}, 0.38)` : catOpen ? `rgba(${NEON_RGB}, 0.31)` : 'rgba(var(--c-text-rgb), 0.08)'}`,
                  borderRadius: '9999px', padding: '0.75rem 1.25rem',
                  fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                  color: categoryId ? NEON : 'var(--c-text)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: NEON }}>category</span>
                {categoryId ? (categories.find(c => c.id === categoryId)?.name?.toUpperCase() ?? 'CATEGORY') : 'CATEGORY'}
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', transition: 'transform 0.2s', transform: catOpen ? 'rotate(180deg)' : 'none' }}>keyboard_arrow_down</span>
              </button>

              {catOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, minWidth: '220px', maxHeight: '320px', overflowY: 'auto',
                  background: 'var(--c-panel)', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(var(--c-text-rgb), 0.08)', borderRadius: '1rem',
                  zIndex: 50, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                }}>
                  <button
                    onClick={() => { selectCategory(''); setCatOpen(false) }}
                    style={{
                      display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.875rem 1.25rem',
                      fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                      color: !categoryId ? NEON : 'rgba(var(--c-text-rgb), 0.6)',
                      background: !categoryId ? `rgba(${NEON_RGB}, 0.06)` : 'none',
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (categoryId) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--c-text-rgb), 0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text)' } }}
                    onMouseLeave={e => { if (categoryId) { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.6)' } }}
                  >
                    <span>ALL CATEGORIES</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{categories.reduce((s, c) => s + c.count, 0)}</span>
                  </button>
                  <div style={{ height: '1px', background: 'rgba(var(--c-text-rgb), 0.06)', margin: '0 1rem' }} />
                  {categories.map(cat => {
                    const active = categoryId === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { selectCategory(active ? '' : cat.id); setCatOpen(false) }}
                        style={{
                          display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.875rem 1.25rem',
                          fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                          color: active ? NEON : 'rgba(var(--c-text-rgb), 0.6)',
                          background: active ? `rgba(${NEON_RGB}, 0.06)` : 'none',
                          border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                          textTransform: 'uppercase',
                        }}
                        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--c-text-rgb), 0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text)' } }}
                        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(var(--c-text-rgb), 0.6)' } }}
                      >
                        <span>{cat.name}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.5, marginLeft: '1rem' }}>{cat.count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Active search badge */}
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1rem', borderRadius: '9999px', flexShrink: 0,
                background: `rgba(${NEON_RGB}, 0.08)`, border: `1px solid rgba(${NEON_RGB}, 0.25)`,
                color: NEON, fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '0.15em', cursor: 'pointer',
              }}
            >
              &ldquo;{search}&rdquo;
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span>
            </button>
          )}
        </div>

        {/* ── Product grid ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grounded-box" style={{ borderRadius: '1.5rem', overflow: 'hidden', opacity: 0.4 }}>
                <div style={{ aspectRatio: '4/3', background: 'rgba(var(--c-text-rgb), 0.03)' }} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ height: '0.5rem', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.06)', width: '40%' }} />
                  <div style={{ height: '1rem', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.06)', width: '80%' }} />
                  <div style={{ height: '0.75rem', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.04)', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '8rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'rgba(var(--c-text-rgb), 0.1)' }}>search_off</span>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1rem', letterSpacing: '0.3em', color: 'rgba(var(--c-text-rgb), 0.3)', textTransform: 'uppercase' }}>
              NO PRODUCTS FOUND
            </p>
            {(search || categoryId) && (
              <button
                onClick={() => { setSearch(''); setSearchInput(''); selectCategory('') }}
                style={{ padding: '0.75rem 2rem', borderRadius: '9999px', border: `1px solid rgba(${NEON_RGB}, 0.25)`, color: NEON, background: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', transition: 'background 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = `rgba(${NEON_RGB}, 0.06)`)}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => router.push(`/product/${p.id}`)}
                saved={isSaved(p.id)}
                onHeartClick={user ? (e) => { e.stopPropagation(); toggle(p.id) } : undefined}
              />
            ))}
          </div>
        )}

        {/* ── Load more ── */}
        {hasMore && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: '1rem 4rem', border: `1px solid rgba(var(--c-text-rgb), 0.1)`, borderRadius: '9999px',
                fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.5em',
                color: loadingMore ? 'rgba(var(--c-text-rgb), 0.3)' : 'rgba(var(--c-text-rgb), 0.6)',
                background: 'none', cursor: loadingMore ? 'default' : 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!loadingMore) { (e.currentTarget as HTMLButtonElement).style.borderColor = NEON; (e.currentTarget as HTMLButtonElement).style.color = NEON } }}
              onMouseLeave={e => { if (!loadingMore) { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(var(--c-text-rgb), 0.1)`; (e.currentTarget as HTMLButtonElement).style.color = `rgba(var(--c-text-rgb), 0.6)` } }}
            >
              {loadingMore ? 'LOADING...' : `LOAD MORE  (${products.length} / ${total})`}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
