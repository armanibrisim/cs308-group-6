'use client'

import { useEffect, useRef, useState, MouseEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { productService } from '../../../services/productService'
import { SideNav } from '../../../components/layout/SideNav'

const NEON = '#39ff14'

const SORT_OPTIONS = [
  { label: 'NEWEST',        sortBy: 'newest',  sortOrder: 'desc' },
  { label: 'PRICE: LOW→HIGH', sortBy: 'price', sortOrder: 'asc'  },
  { label: 'PRICE: HIGH→LOW', sortBy: 'price', sortOrder: 'desc' },
  { label: 'NAME: A→Z',    sortBy: 'name',    sortOrder: 'asc'  },
  { label: 'NAME: Z→A',    sortBy: 'name',    sortOrder: 'desc' },
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
function ProductCard({ product, onClick }: { product: any; onClick: () => void }) {
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
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img} alt={product.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.7s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.08)' }}>image_not_supported</span>
          </div>
        )}
        {/* Out of stock overlay */}
        {!inStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>OUT OF STOCK</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <p style={{ fontSize: '0.6rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          {product.category_id || product.categoryId || 'PRODUCT'}
        </p>
        <h3 style={{ fontSize: '1rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#e5e2e1', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {product.name}
        </h3>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.25rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: '#fff' }}>
            ${(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div style={{
            width: '2.25rem', height: '2.25rem', borderRadius: '50%',
            border: `1px solid ${NEON}4D`,
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
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BrowsePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal]     = useState(0)
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
  // { id, name, count } derived from all products
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([])
  const [sortIdx, setSortIdx]         = useState(0)
  const [sortOpen, setSortOpen]       = useState(false)
  const sortCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [catOpen, setCatOpen]         = useState(false)
  const catCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive categories + counts from ALL products (fetched once, no filters)
  useEffect(() => {
    productService.getProducts({ limit: 500, page: 1 }).then(res => {
      const counts: Record<string, number> = {}
      for (const p of res.products) {
        const cat = (p as any).category_id || p.categoryId
        if (cat) counts[cat] = (counts[cat] || 0) + 1
      }
      const derived = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({
          id,
          name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          count,
        }))
      setCategories(derived)
    }).catch(() => {})
  }, [])

  // Sync filters from URL (e.g. navbar search or category link)
  useEffect(() => {
    setCategoryId(searchParams.get('category_id') || '')
    const s = searchParams.get('search') || ''
    setSearch(s)
    setSearchInput(s)
  }, [searchParams])

  // Fetch products whenever filters change (reset to page 1)
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
      setProducts(res.products)
      setTotal(res.total)
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
      setProducts(prev => [...prev, ...res.products])
      setPage(nextPage)
    }).catch(() => {}).finally(() => setLoadingMore(false))
  }

  const hasMore = products.length < total

  // Search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  return (
    <div style={{ minHeight: '100vh', color: '#e5e2e1', background: '#080808' }}>
      <SideNav />
      <main style={{ paddingTop: '0', paddingBottom: '6rem', paddingLeft: '9rem', paddingRight: '4rem' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '3.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
            ALL PRODUCTS
          </h1>
          {total > 0 && !loading && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em' }}>
              {total} UNITS AVAILABLE
            </p>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2.5rem' }}>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '420px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: `${NEON}80`, fontSize: '1.25rem', pointerEvents: 'none' }}>search</span>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(e as any)}
              placeholder="SEARCH PRODUCTS..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '9999px', padding: '0.75rem 1rem 0.75rem 3rem',
                fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                color: '#fff', outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = `${NEON}50`)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
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
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${sortOpen ? `${NEON}50` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '9999px', padding: '0.75rem 1.25rem',
                fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                color: '#fff', cursor: 'pointer', transition: 'border-color 0.2s', whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: NEON }}>sort</span>
              {SORT_OPTIONS[sortIdx].label}
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', transition: 'transform 0.2s', transform: sortOpen ? 'rotate(180deg)' : 'none' }}>keyboard_arrow_down</span>
            </button>
            {sortOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, minWidth: '220px',
                background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem',
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
                      color: i === sortIdx ? NEON : 'rgba(255,255,255,0.6)',
                      background: i === sortIdx ? `${NEON}10` : 'none',
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (i !== sortIdx) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                    onMouseLeave={e => { if (i !== sortIdx) { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' } }}
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
                  background: categoryId ? `${NEON}15` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${categoryId ? `${NEON}60` : catOpen ? `${NEON}50` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '9999px', padding: '0.75rem 1.25rem',
                  fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                  color: categoryId ? NEON : '#fff', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: NEON }}>category</span>
                {categoryId ? (categories.find(c => c.id === categoryId)?.name?.toUpperCase() ?? 'CATEGORY') : 'CATEGORY'}
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', transition: 'transform 0.2s', transform: catOpen ? 'rotate(180deg)' : 'none' }}>keyboard_arrow_down</span>
              </button>

              {catOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, minWidth: '220px', maxHeight: '320px', overflowY: 'auto',
                  background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem',
                  zIndex: 50, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                }}>
                  {/* ALL option */}
                  <button
                    onClick={() => { selectCategory(''); setCatOpen(false) }}
                    style={{
                      display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.875rem 1.25rem',
                      fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.15em',
                      color: !categoryId ? NEON : 'rgba(255,255,255,0.6)',
                      background: !categoryId ? `${NEON}10` : 'none',
                      border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (categoryId) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                    onMouseLeave={e => { if (categoryId) { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' } }}
                  >
                    <span>ALL CATEGORIES</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{categories.reduce((s, c) => s + c.count, 0)}</span>
                  </button>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 1rem' }} />
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
                          color: active ? NEON : 'rgba(255,255,255,0.6)',
                          background: active ? `${NEON}10` : 'none',
                          border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                          textTransform: 'uppercase',
                        }}
                        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
                        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' } }}
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
                background: `${NEON}15`, border: `1px solid ${NEON}40`,
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
                <div style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ height: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', width: '40%' }} />
                  <div style={{ height: '1rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', width: '80%' }} />
                  <div style={{ height: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '8rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'rgba(255,255,255,0.1)' }}>search_off</span>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
              NO PRODUCTS FOUND
            </p>
            {(search || categoryId) && (
              <button
                onClick={() => { setSearch(''); setSearchInput(''); selectCategory('') }}
                style={{ padding: '0.75rem 2rem', borderRadius: '9999px', border: `1px solid ${NEON}40`, color: NEON, background: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', transition: 'background 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = `${NEON}10`)}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {products.map(p => (
              <ProductCard key={p.id} product={p} onClick={() => router.push(`/product/${p.id}`)} />
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
                padding: '1rem 4rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px',
                fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.5em',
                color: loadingMore ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
                background: 'none', cursor: loadingMore ? 'default' : 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!loadingMore) { (e.currentTarget as HTMLButtonElement).style.borderColor = NEON; (e.currentTarget as HTMLButtonElement).style.color = NEON } }}
              onMouseLeave={e => { if (!loadingMore) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' } }}
            >
              {loadingMore ? 'LOADING...' : `LOAD MORE  (${products.length} / ${total})`}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
