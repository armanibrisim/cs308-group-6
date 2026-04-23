'use client'

import { useEffect, useRef, useState, MouseEvent, memo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import { useWishlist } from '../../../context/WishlistContext'
import { wishlistService } from '../../../services/wishlistService'
import { SideNav } from '../../../components/layout/SideNav'

const NEON = 'var(--c-neon)'
const NEON_RGB = 'var(--c-neon-rgb)'

const WishlistCard = memo(function WishlistCard({
  product,
  saved,
  onClick,
  onRemove,
}: {
  product: any
  saved: boolean
  onClick: () => void
  onRemove: (e: MouseEvent) => void
}) {
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
  const avg: number | null = product.average_rating ?? product.avg_rating ?? null

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="hover-glow grounded-box"
      style={{ borderRadius: '1.5rem', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }}
    >
      {/* Image */}
      <div className="product-img-box" style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.7s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)', filter: inStock ? 'none' : 'grayscale(80%) brightness(0.6)' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: `rgba(${NEON_RGB}, 0.08)` }}>image_not_supported</span>
          </div>
        )}
        {/* Remove from wishlist */}
        <button
          onClick={onRemove}
          title="Remove from wishlist"
          style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', zIndex: 10, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#ff4d6d', fontVariationSettings: "'FILL' 1" }}>favorite</span>
        </button>
        {!inStock && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
            <span style={{ fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 900, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>OUT OF STOCK</span>
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
        {avg != null && avg > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: s <= Math.round(avg!) ? NEON : 'rgba(var(--c-text-rgb), 0.35)', fontVariationSettings: s <= Math.round(avg!) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
            ))}
            <span style={{ fontSize: '0.7rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: NEON, marginLeft: '0.1rem' }}>{avg.toFixed(1)}</span>
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            {product.original_price != null && product.original_price > product.price && (
              <span style={{ fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', color: 'rgba(var(--c-text-rgb), 0.4)', textDecoration: 'line-through' }}>
                ${(product.original_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, color: 'var(--c-text)' }}>
                ${(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {product.discount_percent != null && product.discount_percent > 0 && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, background: NEON, color: '#000', borderRadius: '999px', padding: '0.15rem 0.45rem' }}>
                  -{product.discount_percent.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', border: hovered ? `1px solid ${NEON}` : `1px solid rgba(${NEON_RGB}, 0.30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hovered ? NEON : 'transparent', transition: 'background 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: hovered ? '#000' : NEON, transition: 'color 0.2s' }}>arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default function WishlistPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toggle } = useWishlist()

  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.token) {
      setLoading(false)
      return
    }
    wishlistService.getWishlistProducts(user.token)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [user?.token])

  const handleRemove = async (e: MouseEvent, productId: string) => {
    e.stopPropagation()
    await toggle(productId)
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  if (loading) {
    return (
      <div className="atmospheric-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em' }}>
        LOADING...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="atmospheric-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: `rgba(${NEON_RGB}, 0.3)` }}>favorite</span>
        <p style={{ color: 'rgba(var(--c-text-rgb), 0.4)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.875rem' }}>SIGN IN TO VIEW YOUR WISHLIST</p>
        <button
          onClick={() => router.push('/login')}
          style={{ padding: '0.75rem 2rem', background: NEON, color: '#000', border: 'none', borderRadius: '0.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', cursor: 'pointer' }}
        >
          SIGN IN
        </button>
      </div>
    )
  }

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: 'var(--c-text)', fontFamily: 'Inter, sans-serif' }}>
      <SideNav />
      <main style={{ position: 'relative', zIndex: 10, paddingTop: '2.5rem', paddingBottom: '8rem', paddingLeft: '10rem', paddingRight: '3rem', maxWidth: '1920px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.38em', fontWeight: 700, color: NEON, fontFamily: 'Space Grotesk, sans-serif', marginBottom: '0.5rem', opacity: 0.85 }}>YOUR COLLECTION</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.03em' }}>
              SAVED ITEMS
            </h1>
            {products.length > 0 && (
              <span style={{ fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', color: 'rgba(var(--c-text-rgb), 0.4)', letterSpacing: '0.2em' }}>
                {products.length} {products.length === 1 ? 'ITEM' : 'ITEMS'}
              </span>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0', gap: '1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: `rgba(${NEON_RGB}, 0.15)` }}>favorite</span>
            <p style={{ color: 'rgba(var(--c-text-rgb), 0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.875rem' }}>NO SAVED ITEMS YET</p>
            <button
              onClick={() => router.push('/browse')}
              style={{ padding: '0.75rem 2rem', background: 'none', color: NEON, border: `1px solid ${NEON}4D`, borderRadius: '0.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', cursor: 'pointer' }}
            >
              BROWSE PRODUCTS
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {products.map(p => (
              <WishlistCard
                key={p.id}
                product={p}
                saved={true}
                onClick={() => router.push(`/product/${p.id}`)}
                onRemove={(e) => handleRemove(e, p.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
