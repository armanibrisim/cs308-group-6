'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, MouseEvent } from 'react'
import { productService } from '../services/productService'
import { SideNav } from '../components/layout/SideNav'

const NEON = '#39ff14'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string
  name: string
  price: number
  image_url?: string | null
  category_id?: string
  in_stock?: boolean
  stock_quantity?: number
  rating_count?: number
  rating_sum?: number
  purchase_count?: number
  original_price?: number
  discount_percent?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function avgRating(p: Product): number | null {
  const count = p.rating_count ?? 0
  const sum = p.rating_sum ?? 0
  return count > 0 ? sum / count : null
}

function Stars({ avg, size = '0.875rem' }: { avg: number | null; size?: string }) {
  const has = avg != null && avg > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className="material-symbols-outlined"
          style={{
            fontSize: size,
            color: has ? NEON : 'rgba(255,255,255,0.15)',
            fontVariationSettings: has && s <= Math.round(avg!) ? "'FILL' 1" : "'FILL' 0",
          }}
        >star</span>
      ))}
    </div>
  )
}

// ── GlowCard — same hover-glow style as browse page ──────────────────────────
function GlowCard({
  children, style, className = '', onClick,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={`hover-glow grounded-box ${className}`}
      style={{ borderRadius: '1.5rem', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', ...style }}
      data-hovered={hovered}
    >
      {children}
    </div>
  )
}

// ── ProductCard — matches browse page style ───────────────────────────────────
function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const avg = avgRating(product)
  const hasRating = avg != null && avg > 0
  const inStock = product.in_stock ?? (product.stock_quantity ?? 0) > 0

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="hover-glow grounded-box"
      style={{ borderRadius: '1.5rem', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'contain',
              transition: 'transform 0.7s ease',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.08)' }}>image_not_supported</span>
          </div>
        )}
        {!inStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.6rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>OUT OF STOCK</span>
          </div>
        )}
        {/* Discount badge */}
        {product.discount_percent != null && product.discount_percent > 0 && (
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: NEON, color: '#000', borderRadius: '9999px', padding: '0.2rem 0.6rem', fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', fontFamily: 'Space Grotesk, sans-serif' }}>
            -{Math.round(product.discount_percent)}%
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
        <p style={{ fontSize: '0.6rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          {(product.category_id || 'PRODUCT').replace(/-/g, ' ')}
        </p>
        <h3 style={{ fontSize: '0.95rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#e5e2e1', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {product.name}
        </h3>
        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Stars avg={avg} />
          <span style={{ fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: hasRating ? NEON : 'rgba(255,255,255,0.2)' }}>
            {hasRating ? avg!.toFixed(1) : 'N/A'}
          </span>
          {(product.rating_count ?? 0) > 0 && (
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>({product.rating_count})</span>
          )}
        </div>
        {/* Price + arrow */}
        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {product.original_price != null && product.original_price > product.price && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginRight: '0.4rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                ${product.original_price.toFixed(2)}
              </span>
            )}
            <span style={{ fontSize: '1.15rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: '#fff' }}>
              ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{
            width: '2rem', height: '2rem', borderRadius: '50%',
            border: `1px solid ${NEON}4D`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered ? NEON : 'transparent',
            transition: 'background 0.2s, color 0.2s',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: hovered ? '#000' : NEON, transition: 'color 0.2s' }}>arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, title, cta, onCta }: { label: string; title: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.35em', fontWeight: 800, color: NEON, fontFamily: 'Space Grotesk, sans-serif', marginBottom: '0.3rem' }}>{label}</p>
        <h2 className="font-wide" style={{ fontSize: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#e5e2e1', lineHeight: 1.1 }}>{title}</h2>
      </div>
      {cta && (
        <button
          type="button"
          onClick={onCta}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: `1px solid rgba(255,255,255,0.18)`, borderRadius: '9999px', color: 'rgba(255,255,255,0.7)', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, transition: 'border-color 0.2s, color 0.2s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = NEON; (e.currentTarget as HTMLButtonElement).style.color = NEON }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)' }}
        >
          {cta}
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>arrow_forward</span>
        </button>
      )}
    </div>
  )
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="grounded-box" style={{ borderRadius: '1.5rem', overflow: 'hidden' }}>
      <div style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ height: '8px', width: '40%', borderRadius: '4px', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ height: '14px', width: '80%', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ height: '10px', width: '55%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ height: '20px', width: '35%', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', marginTop: '0.5rem' }} />
      </div>
    </div>
  )
}

// ── Campaign data ──────────────────────────────────────────────────────────────
const CAMPAIGNS = [
  { id: 'deals',   icon: 'local_offer',    label: 'WEEKLY DROPS',    title: 'Fresh Deals',         desc: 'New discounts on top hardware every week. Updated every Monday.',    accent: NEON,       cta: 'Explore Deals'  },
  { id: 'gaming',  icon: 'sports_esports', label: 'SETUP BUILDER',   title: 'Gaming Picks',        desc: 'Curated bundles for high-FPS competitive and immersive gaming.',     accent: '#60a5fa',  cta: 'Build Setup'    },
  { id: 'student', icon: 'school',         label: 'STUDENT LIFE',    title: 'Study Essentials',    desc: 'Portable and affordable picks built for campus and remote work.',    accent: '#f59e0b',  cta: 'View Picks'     },
]

const TRUST = [
  { icon: 'local_shipping', label: 'Free Shipping',   sub: 'On orders over $50' },
  { icon: 'lock',           label: 'Secure Checkout', sub: '256-bit SSL encryption' },
  { icon: 'undo',           label: 'Easy Returns',    sub: '30-day hassle-free' },
  { icon: 'support_agent',  label: '24/7 Support',    sub: 'Real humans, always' },
]

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()

  const [heroProducts, setHeroProducts]       = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [topRatedProducts, setTopRatedProducts] = useState<Product[]>([])
  const [loading, setLoading]                 = useState(true)
  const [activeSlide, setActiveSlide]         = useState(0)
  const [slideDir, setSlideDir]               = useState<1 | -1>(1)
  const [animating, setAnimating]             = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    Promise.all([
      productService.getProducts({ sortBy: 'newest', sortOrder: 'desc', limit: 3 }).catch(() => ({ products: [], total: 0 })),
      productService.getProducts({ sortBy: 'newest', sortOrder: 'desc', limit: 8 }).catch(() => ({ products: [], total: 0 })),
      productService.getProducts({ sortBy: 'avg_rating', sortOrder: 'desc', limit: 8 }).catch(() => ({ products: [], total: 0 })),
    ]).then(([hero, featured, topRated]) => {
      setHeroProducts(hero.products as Product[])
      setFeaturedProducts(featured.products as Product[])
      setTopRatedProducts(topRated.products as Product[])
    }).finally(() => setLoading(false))
  }, [])

  // Auto-advance hero every 5s
  useEffect(() => {
    if (heroProducts.length < 2) return
    intervalRef.current = setInterval(() => goSlide(1), 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroProducts.length, activeSlide])

  const goSlide = (dir: 1 | -1) => {
    if (animating || heroProducts.length === 0) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSlideDir(dir)
    setAnimating(true)
    setTimeout(() => {
      setActiveSlide((cur) => (cur + dir + heroProducts.length) % heroProducts.length)
      setAnimating(false)
    }, 320)
  }

  const hero = heroProducts[activeSlide] ?? null
  const heroAvg = hero ? avgRating(hero) : null
  const heroInStock = hero ? (hero.in_stock ?? (hero.stock_quantity ?? 0) > 0) : false

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', color: '#e5e2e1', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '5%',  width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(57,255,20,0.055) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '0%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 65%)', filter: 'blur(40px)' }} />
      </div>

      <SideNav />

      <main style={{ position: 'relative', zIndex: 1, paddingLeft: '9rem', paddingRight: '2.5rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

        {/* ── 1. HERO ────────────────────────────────────────────────────────── */}
        <section style={{ position: 'relative', minHeight: '520px', borderRadius: '2rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,10,0.9)' }}>
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 45%, rgba(0,0,0,0.15) 100%)', zIndex: 1, pointerEvents: 'none' }} />
          {/* Neon glow behind image */}
          <div style={{ position: 'absolute', right: '10%', top: '50%', transform: 'translateY(-50%)', width: '420px', height: '420px', borderRadius: '50%', background: `radial-gradient(circle, ${NEON}18 0%, transparent 65%)`, zIndex: 1, pointerEvents: 'none' }} />

          {/* Product image background */}
          <div
            style={{
              position: 'absolute', inset: 0,
              opacity: animating ? 0 : 1,
              transform: animating ? `translateX(${slideDir * 30}px)` : 'translateX(0)',
              transition: 'opacity 0.32s ease, transform 0.32s ease',
            }}
          >
            {hero?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.image_url}
                alt={hero.name}
                style={{ position: 'absolute', right: '4%', top: '50%', transform: 'translateY(-50%)', height: '82%', maxWidth: '46%', objectFit: 'contain', filter: 'drop-shadow(0 0 60px rgba(57,255,20,0.15))' }}
              />
            ) : (
              <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', width: '38%', height: '70%', borderRadius: '1.5rem', background: 'rgba(57,255,20,0.04)', border: '1px solid rgba(57,255,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '5rem', color: 'rgba(57,255,20,0.15)' }}>devices</span>
              </div>
            )}
          </div>

          {/* Text content */}
          <div
            style={{
              position: 'relative', zIndex: 2, padding: '3rem 3.5rem', maxWidth: '560px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem',
              opacity: animating ? 0 : 1,
              transform: animating ? `translateX(${-slideDir * 20}px)` : 'translateX(0)',
              transition: 'opacity 0.32s ease, transform 0.32s ease',
            }}
          >
            {loading ? (
              <>
                <div style={{ height: '10px', width: '100px', borderRadius: '4px', background: 'rgba(57,255,20,0.2)' }} />
                <div style={{ height: '48px', width: '80%', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ height: '16px', width: '60%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }} />
              </>
            ) : hero ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.35em', fontWeight: 800, color: NEON, fontFamily: 'Space Grotesk, sans-serif' }}>NEW ARRIVAL</span>
                  {hero.category_id && (
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '0.75rem' }}>
                      {hero.category_id.replace(/-/g, ' ')}
                    </span>
                  )}
                </div>

                <h1 className="font-wide" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', lineHeight: 1.05, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
                  {hero.name}
                </h1>

                {/* Rating */}
                {heroAvg != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Stars avg={heroAvg} size="1rem" />
                    <span style={{ fontSize: '0.8rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>{heroAvg.toFixed(1)}</span>
                    {(hero.rating_count ?? 0) > 0 && (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>({hero.rating_count} reviews)</span>
                    )}
                  </div>
                )}

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  {hero.original_price != null && hero.original_price > hero.price && (
                    <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontFamily: 'Space Grotesk, sans-serif' }}>
                      ${hero.original_price.toLocaleString()}
                    </span>
                  )}
                  <span style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: '#fff', letterSpacing: '-0.02em' }}>
                    ${Math.floor(hero.price).toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    .{((hero.price % 1)).toFixed(2).substring(2)}
                  </span>
                  {hero.discount_percent != null && hero.discount_percent > 0 && (
                    <span style={{ fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, color: '#000', background: NEON, borderRadius: '9999px', padding: '0.2rem 0.6rem', letterSpacing: '0.1em' }}>
                      -{Math.round(hero.discount_percent)}% OFF
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/product/${hero.id}`)}
                    style={{ border: 'none', cursor: 'pointer', borderRadius: '9999px', padding: '0.85rem 1.75rem', background: NEON, color: '#000', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Space Grotesk, sans-serif', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: `0 0 20px ${NEON}40` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 30px ${NEON}60` }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${NEON}40` }}
                  >
                    View Product
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/browse')}
                    style={{ border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', borderRadius: '9999px', padding: '0.85rem 1.75rem', background: 'rgba(255,255,255,0.04)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Space Grotesk, sans-serif', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${NEON}60` }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)' }}
                  >
                    Browse All
                  </button>
                  {!heroInStock && (
                    <span style={{ alignSelf: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', fontFamily: 'Space Grotesk, sans-serif' }}>OUT OF STOCK</span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.8rem' }}>NO PRODUCTS FOUND</div>
            )}
          </div>

          {/* Slide controls */}
          {heroProducts.length > 1 && (
            <div style={{ position: 'absolute', bottom: '1.5rem', left: '3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 3 }}>
              <button type="button" onClick={() => goSlide(-1)} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = NEON }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
              </button>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {heroProducts.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setActiveSlide(i) }}
                    style={{ width: i === activeSlide ? '20px' : '6px', height: '6px', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: i === activeSlide ? NEON : 'rgba(255,255,255,0.3)', transition: 'width 0.3s ease, background 0.3s ease', padding: 0 }}
                  />
                ))}
              </div>
              <button type="button" onClick={() => goSlide(1)} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = NEON }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
              </button>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', fontFamily: 'Space Grotesk, sans-serif', marginLeft: '0.25rem' }}>
                {String(activeSlide + 1).padStart(2, '0')} / {String(heroProducts.length).padStart(2, '0')}
              </span>
            </div>
          )}
        </section>

        {/* ── 2. TRUST STRIP ────────────────────────────────────────────────── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {TRUST.map((item) => (
            <div key={item.icon} className="glass-panel" style={{ borderRadius: '1.25rem', padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: `${NEON}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: NEON, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#e5e2e1', marginBottom: '0.15rem' }}>{item.label}</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── 3. CAMPAIGN CARDS ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="COLLECTIONS" title="Shop by Category" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {CAMPAIGNS.map((card) => (
              <GlowCard key={card.id} onClick={() => router.push('/browse')}>
                {/* Accent header */}
                <div style={{ padding: '2rem 1.75rem 1.5rem', background: `linear-gradient(135deg, ${card.accent}12 0%, transparent 60%)`, borderBottom: `1px solid ${card.accent}18`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '1rem', background: `${card.accent}18`, border: `1px solid ${card.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: card.accent, fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
                  </div>
                  <span style={{ fontSize: '0.55rem', letterSpacing: '0.3em', fontWeight: 800, color: card.accent, fontFamily: 'Space Grotesk, sans-serif' }}>{card.label}</span>
                </div>
                {/* Body */}
                <div style={{ padding: '1.25rem 1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#e5e2e1', margin: 0 }}>{card.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: card.accent, fontSize: '0.72rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {card.cta}
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>arrow_forward</span>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </section>

        {/* ── 4. FEATURED PRODUCTS ──────────────────────────────────────────── */}
        <section>
          <SectionHeader label="JUST DROPPED" title="Featured Products" cta="See All" onCta={() => router.push('/browse')} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            {loading || featuredProducts.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              : featuredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onClick={() => router.push(`/product/${p.id}`)} />
                ))}
          </div>
        </section>

        {/* ── 5. TOP RATED ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="COMMUNITY PICKS" title="Top Rated" cta="Browse All" onCta={() => router.push('/browse?sortBy=avg_rating&sortOrder=desc')} />
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {loading || topRatedProducts.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ minWidth: '240px', flexShrink: 0 }}><SkeletonCard /></div>
                ))
              : topRatedProducts.map((p) => (
                  <div key={p.id} style={{ minWidth: '240px', maxWidth: '240px', flexShrink: 0 }}>
                    <ProductCard product={p} onClick={() => router.push(`/product/${p.id}`)} />
                  </div>
                ))}
          </div>
        </section>

      </main>
    </div>
  )
}
