'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, MouseEvent, useCallback, memo } from 'react'
import { productService } from '../services/productService'
import { SideNav } from '../components/layout/SideNav'

const NEON = 'var(--c-neon)'
const NEON_RGB = 'var(--c-neon-rgb)'

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

const Stars = memo(function Stars({ avg, size = '0.875rem' }: { avg: number | null; size?: string }) {
  const has = avg != null && avg > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className="material-symbols-outlined"
          style={{
            fontSize: size,
            color: has && s <= Math.round(avg!) ? NEON : 'rgba(var(--c-text-rgb), 0.35)',
            fontVariationSettings: has && s <= Math.round(avg!) ? "'FILL' 1" : "'FILL' 0",
          }}
        >star</span>
      ))}
    </div>
  )
})

// ── GlowCard ──────────────────────────────────────────────────────────────────
const GlowCard = memo(function GlowCard({
  children, style, className = '', onClick,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`)
  }, [])

  const onEnter = useCallback(() => setHovered(true), [])
  const onLeave = useCallback(() => setHovered(false), [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`hover-glow grounded-box ${className}`}
      style={{ borderRadius: '1.5rem', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', ...style }}
      data-hovered={hovered}
    >
      {children}
    </div>
  )
})

// ── ProductCard ───────────────────────────────────────────────────────────────
const ProductCard = memo(function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const avg = avgRating(product)
  const hasRating = avg != null && avg > 0
  const inStock = product.in_stock ?? (product.stock_quantity ?? 0) > 0

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`)
  }, [])

  const onEnter = useCallback(() => setHovered(true), [])
  const onLeave = useCallback(() => setHovered(false), [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="hover-glow grounded-box"
      style={{ borderRadius: '1.25rem', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s ease, box-shadow 0.2s ease', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', boxShadow: hovered ? `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(${NEON_RGB}, 0.09)` : '0 4px 20px rgba(0,0,0,0.3)' }}
    >
      {/* Image */}
      <div className="product-img-box" style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'contain',
              transition: 'transform 0.6s ease, filter 0.3s ease',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
              filter: inStock ? 'none' : 'grayscale(80%) brightness(0.6)',
              padding: '0.5rem',
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: `rgba(${NEON_RGB}, 0.07)` }}>image_not_supported</span>
          </div>
        )}
        {!inStock && (
          <div className="oos-overlay" style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined oos-icon" style={{ fontSize: '2.2rem' }}>remove_shopping_cart</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
              <span className="oos-label" style={{ fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase' }}>OUT OF STOCK</span>
              <div className="oos-line" style={{ width: '100%', height: '2px', borderRadius: '2px' }} />
            </div>
          </div>
        )}
        {product.discount_percent != null && product.discount_percent > 0 && (
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: NEON, color: '#000', borderRadius: '0.35rem', padding: '0.2rem 0.55rem', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', fontFamily: 'Space Grotesk, sans-serif' }}>
            -{Math.round(product.discount_percent)}%
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '1rem 1.125rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        <p style={{ fontSize: '0.58rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.8 }}>
          {(product.category_id || 'PRODUCT').replace(/-/g, ' ')}
        </p>
        <h3 style={{ fontSize: '0.9rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 'calc(0.9rem * 1.35 * 2)' }}>
          {product.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Stars avg={avg} />
          <span style={{ fontSize: '0.68rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: hasRating ? NEON : `rgba(${NEON_RGB}, 0.18)` }}>
            {hasRating ? avg!.toFixed(1) : 'N/A'}
          </span>
          {(product.rating_count ?? 0) > 0 && (
            <span style={{ fontSize: '0.6rem', color: 'rgba(var(--c-text-rgb), 0.25)' }}>({product.rating_count})</span>
          )}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '0.65rem', borderTop: '1px solid rgba(var(--c-text-rgb), 0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {product.original_price != null && product.original_price > product.price && (
              <span style={{ fontSize: '0.68rem', color: 'rgba(var(--c-text-rgb), 0.25)', textDecoration: 'line-through', marginRight: '0.4rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                ${product.original_price.toFixed(2)}
              </span>
            )}
            <span style={{ fontSize: '1.1rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: 'var(--c-text)' }}>
              ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{
            width: '1.85rem', height: '1.85rem', borderRadius: '50%',
            border: hovered ? `1px solid ${NEON}` : `1px solid rgba(${NEON_RGB}, 0.20)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered ? NEON : 'transparent',
            transition: 'all 0.2s ease',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.95rem', color: hovered ? '#000' : NEON, transition: 'color 0.2s' }}>arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  )
})

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, title, cta, onCta }: { label: string; title: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.38em', fontWeight: 700, color: NEON, fontFamily: 'Space Grotesk, sans-serif', marginBottom: '0.4rem', opacity: 0.85 }}>{label}</p>
        <h2 style={{ fontSize: '1.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>{title}</h2>
      </div>
      {cta && (
        <button
          type="button"
          onClick={onCta}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: `1px solid rgba(var(--c-text-rgb), 0.12)`, borderRadius: '9999px', color: `rgba(var(--c-text-rgb), 0.55)`, padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.15em', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, transition: 'border-color 0.2s, color 0.2s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${NEON_RGB}, 0.38)`; (e.currentTarget as HTMLButtonElement).style.color = NEON }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(var(--c-text-rgb), 0.12)`; (e.currentTarget as HTMLButtonElement).style.color = `rgba(var(--c-text-rgb), 0.55)` }}
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
    <div className="grounded-box" style={{ borderRadius: '1.25rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ aspectRatio: '4/3', background: 'rgba(var(--c-text-rgb), 0.03)', flexShrink: 0 }} />
      <div style={{ padding: '1rem 1.125rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
        <div style={{ height: '8px', width: '35%', borderRadius: '4px', background: `rgba(${NEON_RGB}, 0.1)` }} />
        <div style={{ height: '13px', width: '92%', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.08)' }} />
        <div style={{ height: '13px', width: '60%', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.05)' }} />
        <div style={{ height: '9px', width: '48%', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.05)' }} />
        <div style={{ marginTop: 'auto', paddingTop: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ height: '16px', width: '30%', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.08)' }} />
          <div style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', background: 'rgba(var(--c-text-rgb), 0.04)' }} />
        </div>
      </div>
    </div>
  )
}

// ── Category cards ────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'smartphones',
    icon: 'smartphone',
    label: 'MOBILE',
    title: 'Smartphones',
    desc: 'Latest smartphones with cutting-edge cameras and top-tier performance.',
    accent: '#60a5fa',
    accentRgb: '96,165,250',
  },
  {
    id: 'laptops',
    icon: 'laptop',
    label: 'COMPUTING',
    title: 'Laptops',
    desc: 'High-performance laptops for work, gaming, study, and creation.',
    accent: 'var(--c-neon)',
    accentRgb: 'var(--c-neon-rgb)',
  },
  {
    id: 'mobile-accessories',
    icon: 'cable',
    label: 'ACCESSORIES',
    title: 'Mobile Accessories',
    desc: 'Essential cables, cases, chargers, and accessories for your devices.',
    accent: '#f59e0b',
    accentRgb: '245,158,11',
  },
]

const TRUST = [
  { icon: 'local_shipping', label: 'Free Shipping', sub: 'On orders over $5000' },
  { icon: 'lock', label: 'Secure Checkout', sub: '256-bit SSL encryption' },
  { icon: 'undo', label: 'Easy Returns', sub: '30-day hassle-free' },
  { icon: 'support_agent', label: '24/7 Support', sub: 'Real humans, always' },
]

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()

  const [heroProducts, setHeroProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [topRatedProducts, setTopRatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const [slideDir, setSlideDir] = useState<1 | -1>(1)
  const [animating, setAnimating] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animatingRef = useRef(false)
  const heroLenRef = useRef(0)

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

  // Keep refs in sync so the interval callback is stable
  useEffect(() => { animatingRef.current = animating }, [animating])
  useEffect(() => { heroLenRef.current = heroProducts.length }, [heroProducts.length])

  const goSlide = useCallback((dir: 1 | -1) => {
    if (animatingRef.current || heroLenRef.current === 0) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSlideDir(dir)
    setAnimating(true)
    animatingRef.current = true
    setTimeout(() => {
      setActiveSlide((cur) => (cur + dir + heroLenRef.current) % heroLenRef.current)
      setAnimating(false)
      animatingRef.current = false
    }, 320)
  }, [])

  useEffect(() => {
    if (heroProducts.length < 2) return
    intervalRef.current = setInterval(() => goSlide(1), 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [heroProducts.length, goSlide])

  const hero = heroProducts[activeSlide] ?? null
  const heroAvg = hero ? avgRating(hero) : null
  const heroInStock = hero ? (hero.in_stock ?? (hero.stock_quantity ?? 0) > 0) : false

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)', position: 'relative', overflow: 'hidden' }}>

      {/* Subtle ambient orb — only one, very faint */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      <SideNav />

      <main style={{ position: 'relative', zIndex: 1, paddingLeft: '9rem', paddingRight: '2.5rem', paddingBottom: '7rem', display: 'flex', flexDirection: 'column', gap: '4rem' }}>

        {/* ── 1. HERO ────────────────────────────────────────────────────────── */}
        <section style={{ position: 'relative', minHeight: '580px', borderRadius: '2rem', overflow: 'hidden', border: '1px solid rgba(var(--c-text-rgb), 0.07)', background: 'var(--c-hero)', marginTop: '1.5rem' }}>

          {/* Left-side gradient that bleeds into image */}
          <div className="hero-gradient-overlay" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

          {/* Soft neon halo behind product */}
          <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', width: '380px', height: '380px', borderRadius: '50%', background: `radial-gradient(circle, rgba(${NEON_RGB}, 0.07) 0%, transparent 60%)`, zIndex: 1, pointerEvents: 'none', filter: 'blur(20px)' }} />

          {/* Product image */}
          <div
            style={{
              position: 'absolute', inset: 0,
              opacity: animating ? 0 : 1,
              transform: animating ? `translateX(${slideDir * 40}px)` : 'translateX(0)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            {hero?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.image_url}
                alt={hero.name}
                style={{ position: 'absolute', right: '3%', top: '50%', transform: 'translateY(-50%)', height: '85%', maxWidth: '48%', objectFit: 'contain', filter: 'drop-shadow(0 8px 40px rgba(0,0,0,0.6))' }}
              />
            ) : (
              <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', width: '38%', height: '70%', borderRadius: '1.5rem', background: `rgba(${NEON_RGB}, 0.03)`, border: `1px solid rgba(${NEON_RGB}, 0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '5rem', color: `rgba(${NEON_RGB}, 0.12)` }}>devices</span>
              </div>
            )}
          </div>

          {/* Text content */}
          <div
            style={{
              position: 'relative', zIndex: 2,
              padding: '3.5rem 4rem',
              maxWidth: '540px',
              height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.1rem',
              opacity: animating ? 0 : 1,
              transform: animating ? `translateX(${-slideDir * 24}px)` : 'translateX(0)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            {loading ? (
              <>
                <div style={{ height: '8px', width: '80px', borderRadius: '4px', background: `rgba(${NEON_RGB}, 0.15)` }} />
                <div style={{ height: '52px', width: '85%', borderRadius: '8px', background: 'rgba(var(--c-text-rgb), 0.05)' }} />
                <div style={{ height: '14px', width: '55%', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.03)' }} />
                <div style={{ height: '40px', width: '40%', borderRadius: '4px', background: 'rgba(var(--c-text-rgb), 0.03)' }} />
              </>
            ) : hero ? (
              <>
                {/* Eyebrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ width: '24px', height: '1px', background: NEON, opacity: 0.6 }} />
                  <span style={{ fontSize: '0.58rem', letterSpacing: '0.4em', fontWeight: 700, color: NEON, fontFamily: 'Space Grotesk, sans-serif' }}>NEW ARRIVAL</span>
                  {hero.category_id && (
                    <span className="hero-cat" style={{ fontSize: '0.58rem', letterSpacing: '0.2em', fontWeight: 600, color: 'rgba(var(--c-text-rgb), 0.35)', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase' }}>
                      / {hero.category_id.replace(/-/g, ' ')}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="hero-title" style={{ fontSize: 'clamp(1.4rem, 2.2vw, 2.1rem)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, lineHeight: 1.18, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.02em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {hero.name}
                </h1>

                {/* Rating */}
                {heroAvg != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Stars avg={heroAvg} size="0.95rem" />
                    <span style={{ fontSize: '0.78rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>{heroAvg.toFixed(1)}</span>
                    {(hero.rating_count ?? 0) > 0 && (
                      <span className="hero-reviews" style={{ fontSize: '0.68rem', color: 'rgba(var(--c-text-rgb), 0.3)' }}>({hero.rating_count} reviews)</span>
                    )}
                  </div>
                )}

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  {hero.original_price != null && hero.original_price > hero.price && (
                    <span className="hero-orig-price" style={{ fontSize: '1rem', color: 'rgba(var(--c-text-rgb), 0.28)', textDecoration: 'line-through', fontFamily: 'Space Grotesk, sans-serif' }}>
                      ${hero.original_price.toLocaleString()}
                    </span>
                  )}
                  <span className="hero-price-main" style={{ fontSize: '2.75rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: 'var(--c-text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    ${Math.floor(hero.price).toLocaleString()}
                  </span>
                  <span className="hero-price-cents" style={{ fontSize: '1.25rem', color: 'rgba(var(--c-text-rgb), 0.35)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300 }}>
                    .{((hero.price % 1)).toFixed(2).substring(2)}
                  </span>
                  {hero.discount_percent != null && hero.discount_percent > 0 && (
                    <span style={{ fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, color: '#000', background: NEON, borderRadius: '0.35rem', padding: '0.2rem 0.55rem', letterSpacing: '0.08em', marginLeft: '0.25rem' }}>
                      -{Math.round(hero.discount_percent)}% OFF
                    </span>
                  )}
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/product/${hero.id}`)}
                    style={{ border: 'none', cursor: 'pointer', borderRadius: '0.6rem', padding: '0.85rem 1.75rem', background: NEON, color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', fontFamily: 'Space Grotesk, sans-serif', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: `0 4px 20px rgba(${NEON_RGB}, 0.21)` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 28px rgba(${NEON_RGB}, 0.33)` }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px rgba(${NEON_RGB}, 0.21)` }}
                  >
                    View Product
                  </button>
                  <button
                    type="button"
                    className="hero-browse-btn"
                    onClick={() => router.push('/browse')}
                    style={{ border: '1px solid rgba(var(--c-text-rgb), 0.15)', cursor: 'pointer', borderRadius: '0.6rem', padding: '0.85rem 1.75rem', background: 'rgba(var(--c-text-rgb), 0.04)', color: 'rgba(var(--c-text-rgb), 0.8)', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.12em', fontFamily: 'Space Grotesk, sans-serif', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s, color 0.2s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${NEON_RGB}, 0.31)`; (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-text)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(var(--c-text-rgb), 0.15)`; (e.currentTarget as HTMLButtonElement).style.color = `rgba(var(--c-text-rgb), 0.8)` }}
                  >
                    Browse All
                  </button>
                  {!heroInStock && (
                    <span className="hero-oos" style={{ alignSelf: 'center', fontSize: '0.62rem', color: 'rgba(var(--c-text-rgb), 0.28)', letterSpacing: '0.2em', fontFamily: 'Space Grotesk, sans-serif' }}>OUT OF STOCK</span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: 'rgba(var(--c-text-rgb), 0.18)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.75rem' }}>NO PRODUCTS FOUND</div>
            )}
          </div>

          {/* Slide controls */}
          {heroProducts.length > 1 && (
            <div style={{ position: 'absolute', bottom: '2rem', left: '4rem', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 3 }}>
              <button type="button" className="hero-nav-btn" onClick={() => goSlide(-1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(var(--c-text-rgb), 0.15)', background: 'rgba(0,0,0,0.5)', color: 'var(--c-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${NEON_RGB}, 0.38)` }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.15)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_left</span>
              </button>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                {heroProducts.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setActiveSlide(i) }}
                    style={{ width: i === activeSlide ? '18px' : '5px', height: '5px', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: i === activeSlide ? NEON : 'rgba(var(--c-text-rgb), 0.25)', transition: 'width 0.3s ease, background 0.3s ease', padding: 0 }}
                  />
                ))}
              </div>
              <button type="button" className="hero-nav-btn" onClick={() => goSlide(1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(var(--c-text-rgb), 0.15)', background: 'rgba(0,0,0,0.5)', color: 'var(--c-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${NEON_RGB}, 0.38)` }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--c-text-rgb), 0.15)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
              </button>
              <span style={{ fontSize: '0.58rem', color: 'rgba(var(--c-text-rgb), 0.25)', letterSpacing: '0.2em', fontFamily: 'Space Grotesk, sans-serif', marginLeft: '0.25rem' }}>
                {String(activeSlide + 1).padStart(2, '0')} / {String(heroProducts.length).padStart(2, '0')}
              </span>
            </div>
          )}
        </section>

        {/* ── 2. TRUST STRIP ────────────────────────────────────────────────── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {TRUST.map((item) => (
            <div key={item.icon} className="grounded-box" style={{ borderRadius: '1rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.6rem', background: `rgba(${NEON_RGB}, 0.08)`, border: `1px solid rgba(${NEON_RGB}, 0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.15rem', color: NEON, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: 'var(--c-text)', marginBottom: '0.1rem' }}>{item.label}</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(var(--c-text-rgb), 0.3)', letterSpacing: '0.03em' }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── 3. CATEGORY CARDS ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="COLLECTIONS" title="Shop by Category" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {CATEGORIES.map((cat) => (
              <GlowCard key={cat.id} onClick={() => router.push(`/browse?category_id=${encodeURIComponent(cat.id)}`)}>
                {/* Top header */}
                <div style={{ padding: '1.75rem 1.75rem 1.35rem', background: `linear-gradient(140deg, rgba(${cat.accentRgb}, 0.055) 0%, transparent 55%)`, borderBottom: `1px solid rgba(${cat.accentRgb}, 0.08)`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.85rem', background: `rgba(${cat.accentRgb}, 0.08)`, border: `1px solid rgba(${cat.accentRgb}, 0.16)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: cat.accent, fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                  </div>
                  <span style={{ fontSize: '0.52rem', letterSpacing: '0.35em', fontWeight: 700, color: cat.accent, fontFamily: 'Space Grotesk, sans-serif', opacity: 0.8 }}>{cat.label}</span>
                </div>
                {/* Body */}
                <div style={{ padding: '1.25rem 1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>{cat.title}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(var(--c-text-rgb), 0.4)', lineHeight: 1.65, margin: 0 }}>{cat.desc}</p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: cat.accent, fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.06em' }}>
                    Shop {cat.title}
                    <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>arrow_forward</span>
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
                <div key={i} style={{ minWidth: '230px', maxWidth: '230px', flexShrink: 0 }}><SkeletonCard /></div>
              ))
              : topRatedProducts.map((p) => (
                <div key={p.id} style={{ minWidth: '230px', maxWidth: '230px', flexShrink: 0 }}>
                  <ProductCard product={p} onClick={() => router.push(`/product/${p.id}`)} />
                </div>
              ))}
          </div>
        </section>

      </main>
    </div>
  )
}
