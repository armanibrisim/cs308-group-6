'use client'

import { useState, useRef, MouseEvent, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productService } from '../../../../services/productService'
import { cartService } from '../../../../services/cartService'
import { useAuth } from '../../../../context/AuthContext'
import { SideNav } from '../../../../components/layout/SideNav'

const NEON = '#39ff14'

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

  useEffect(() => {
    if (!id) return
    productService
      .getProduct(id)
      .then((data) => {
        setProduct(data)
        const images: string[] = (data as any).all_images || []
        if (images.length > 0) {
          setThumbnails(images)
          setMainImage(images[0])
        } else {
          const single = (data as any).image_url
          if (single) {
            setThumbnails([single])
            setMainImage(single)
          }
        }
        const catId = (data as any).category_id || (data as any).categoryId
        if (catId) {
          productService
            .getProducts({ categoryId: catId, limit: 8 })
            .then((res) => setRelatedProducts(res.products.filter((p: any) => p.id !== data.id)))
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

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
      <div className="atmospheric-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em' }}>
        ENTITY NOT FOUND
      </div>
    )
  }

  const stockQty = product?.stock_quantity ?? product?.stockQuantity ?? 0
  const inStock = stockQty > 0

  return (
    <div className="atmospheric-bg" style={{ minHeight: '100vh', color: '#e5e2e1', fontFamily: 'Inter, sans-serif' }}>
      <SideNav />
      <main style={{ position: 'relative', zIndex: 10, paddingBottom: '6rem', paddingLeft: '9rem', paddingRight: '2rem', maxWidth: '1920px', margin: '0 auto' }}>

        {/* ── Product Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4rem', alignItems: 'start' }}>

          {/* ── Left: Image Gallery ── */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Main image */}
            <GlowBox style={{ borderRadius: '1.5rem', aspectRatio: '16/10', overflow: 'hidden' }}>
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
                    <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'rgba(255,255,255,0.1)' }}>image_not_supported</span>
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
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(57,255,20,0.2)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
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
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(57,255,20,0.2)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
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
                    border: `2px solid ${src === mainImage ? NEON : 'rgba(255,255,255,0.05)'}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: 'pointer',
                    background: '#111',
                    transition: 'border-color 0.2s ease, filter 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (src !== mainImage) (e.currentTarget as HTMLDivElement).style.borderColor = `${NEON}80` }}
                  onMouseLeave={(e) => { if (src !== mainImage) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
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
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', background: `${NEON}22`, color: NEON, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, fontFamily: 'Space Grotesk, sans-serif' }}>
                    {(product?.category_id || product?.categoryId).replace(/-/g, ' ')}
                  </span>
                )}
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', background: inStock ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.05)', color: inStock ? NEON : 'rgba(255,255,255,0.4)', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>
                  {inStock ? `IN STOCK — ${stockQty} units` : 'OUT OF STOCK'}
                </span>
              </div>

              {/* Title */}
              <h1 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#e5e2e1', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1rem' }}>
                {product?.name || 'UNKNOWN ENTITY'}
              </h1>

              {/* Rating */}
              {(() => {
                const avg = product?.average_rating ?? product?.rating ?? null
                const count = product?.review_count ?? null
                const hasRating = avg != null && avg > 0
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: hasRating ? NEON : 'rgba(255,255,255,0.2)' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: hasRating && s <= Math.round(avg!) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                      ))}
                      <span style={{ fontSize: '1rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginLeft: '0.5rem', color: hasRating ? NEON : 'rgba(255,255,255,0.3)' }}>
                        {hasRating ? avg!.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.2em', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5rem' }}>
                      {count != null && count > 0 ? `${count} REVIEW${count !== 1 ? 'S' : ''}` : 'NO RATINGS YET'}
                    </span>
                  </div>
                )
              })()}

              {/* Price */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '3.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 300, letterSpacing: '-0.03em', color: '#fff' }}>
                    ${Math.floor(product?.price || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    .{((product?.price || 0) % 1).toFixed(2).substring(2)}
                  </span>
                </div>
              </div>

              {/* Qty selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', fontFamily: 'Space Grotesk, sans-serif' }}>QTY</span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <button
                    className="qty-btn"
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', cursor: qty <= 1 ? 'not-allowed' : 'pointer', color: qty <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >−</button>
                  <span style={{ minWidth: '2.5rem', textAlign: 'center', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#fff' }}>{qty}</span>
                  <button
                    className="qty-btn"
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', cursor: qty >= stockQty ? 'not-allowed' : 'pointer', color: qty >= stockQty ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setQty(q => Math.min(stockQty, q + 1))}
                    disabled={qty >= stockQty}
                  >+</button>
                </div>
                {stockQty > 0 && (
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{stockQty} IN STOCK</span>
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
                  background: cartStatus === 'success' ? '#22c55e' : cartStatus === 'error' ? '#ef4444' : inStock ? NEON : 'rgba(255,255,255,0.08)',
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
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(57,255,20,0.35)'
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { icon: 'favorite', label: 'SAVE' },
                  { icon: 'compare_arrows', label: 'COMPARE' },
                  { icon: 'share', label: 'SHARE' },
                ].map((action, i) => (
                  <button
                    key={action.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'rgba(255,255,255,0.4)',
                      background: 'none',
                      border: 'none',
                      borderLeft: i === 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      borderRight: i === 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      cursor: 'pointer',
                      padding: '0.75rem 0.5rem',
                      transition: 'color 0.2s ease, transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.color = NEON
                      ;(e.currentTarget as HTMLButtonElement).querySelector('.material-symbols-outlined')?.setAttribute('style', `font-size: 1.5rem; transform: scale(1.25); transition: transform 0.2s; color: ${NEON}`)
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'
                      ;(e.currentTarget as HTMLButtonElement).querySelector('.material-symbols-outlined')?.setAttribute('style', 'font-size: 1.5rem; transform: scale(1); transition: transform 0.2s')
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', transition: 'transform 0.2s' }}>{action.icon}</span>
                    <span style={{ fontSize: '0.5625rem', textTransform: 'uppercase' as const, fontWeight: 700, letterSpacing: '0.2em' }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </GlowBox>
          </div>
        </div>

        {/* ── Tabs Section ── */}
        <section style={{ marginTop: '8rem' }}>
          {/* Tab triggers */}
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '3rem', overflowX: 'auto', paddingLeft: '1rem' }}>
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
                  color: activeTab === tab.id ? NEON : 'rgba(255,255,255,0.4)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? NEON : 'transparent'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap' as const,
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)' }}
                onMouseLeave={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <GlowBox style={{ padding: '4rem', borderRadius: '1.5rem', minHeight: '400px' }}>

            {/* Description */}
            {activeTab === 'desc' && (
              <div style={{ maxWidth: '56rem' }}>
                {product?.description ? (
                  <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.85, fontWeight: 300, whiteSpace: 'pre-line' }}>
                    {product.description}
                  </p>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.875rem' }}>
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
                    <p style={{ fontSize: '1rem', fontFamily: 'Space Grotesk, sans-serif', color: '#fff', fontWeight: 300, wordBreak: 'break-all' as const }}>{spec.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>USER REVIEWS</h3>
                  <button
                    style={{ padding: '0.5rem 1.5rem', border: `1px solid ${NEON}4D`, color: NEON, fontSize: '0.75rem', letterSpacing: '0.2em', background: 'none', cursor: 'pointer', borderRadius: '0.25rem', transition: 'background 0.2s ease' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${NEON}1A`)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                  >
                    WRITE A REVIEW
                  </button>
                </div>
                {(product?.reviews && product.reviews.length > 0) ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                    {product.reviews.map((review: any) => (
                      <ReviewCard key={review.id || review.user_id} user={review.username || review.user_id || 'ANONYMOUS'} text={review.comment || review.text || ''} rating={review.rating} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.1)' }}>rate_review</span>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em', fontSize: '0.875rem' }}>NO REVIEWS YET</p>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>Be the first to review this product</p>
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
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}>
                    <span className="material-symbols-outlined" style={{ color: NEON, flexShrink: 0 }}>shield</span>
                    <span>
                      <strong style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}>Warranty: </strong>
                      {product?.warranty || 'No warranty information available.'}
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}>
                    <span className="material-symbols-outlined" style={{ color: NEON, flexShrink: 0 }}>verified</span>
                    <span>30-day return policy from date of purchase.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}>
                    <span className="material-symbols-outlined" style={{ color: NEON, flexShrink: 0 }}>support_agent</span>
                    <span>Contact support for return authorisation and shipping details.</span>
                  </li>
                </ul>
              </div>
            )}
          </GlowBox>
        </section>

        {/* ── Related Products ── */}
        <section style={{ marginTop: '8rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '3rem', color: '#e5e2e1' }}>
            CO-ORDINATED SYSTEMS
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem' }}>
            {relatedProducts.slice(0, 3).map((p) => (
              <RelatedCard key={p.id} product={p} onClick={() => router.push(`/product/${p.id}`)} />
            ))}
          </div>

          {showCatalogue && relatedProducts.length > 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2.5rem', marginTop: '3rem' }}>
              {relatedProducts.slice(3, 7).map((p) => (
                <RelatedCard key={p.id} product={p} onClick={() => router.push(`/product/${p.id}`)} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5rem' }}>
            <button
              onClick={() => setShowCatalogue(true)}
              style={{
                padding: '1rem 4rem',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '0.5em',
                color: 'rgba(255,255,255,0.6)',
                background: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = NEON
                ;(e.currentTarget as HTMLButtonElement).style.color = NEON
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
              }}
            >
              BROWSE CATALOGUE
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{ marginTop: '8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5rem', paddingBottom: '5rem', background: '#080808' }}>
        <div style={{ maxWidth: '1920px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.05em', color: '#9ca3af', fontFamily: 'Space Grotesk, sans-serif' }}>LUMEN</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 1.75 }}>
              Pioneering the future of computational hardware. Engineered for the enthusiasts, the creators, and the visionaries.
            </p>
          </div>
          {[
            { title: 'Systems', links: ['Neon Series', 'Quantum Series', 'Workstation Pro', 'Custom Build'] },
            { title: 'Support', links: ['Technical Logs', 'Deployment Status', 'Firmware Updates', 'Global Network'] },
          ].map((col) => (
            <div key={col.title}>
              <h5 style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.75rem', marginBottom: '2rem', textTransform: 'uppercase' }}>{col.title}</h5>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: 0, listStyle: 'none' }}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = NEON)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)')}
                    >{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h5 style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.75rem', marginBottom: '2rem', textTransform: 'uppercase' }}>Newsletter</h5>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="ACCESS_ID@MAIL.COM"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.75rem', flex: 1, color: '#fff', outline: 'none', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.1em' }}
                onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = `${NEON}50`)}
                onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button
                style={{ background: NEON, color: '#000', border: 'none', borderRadius: '0.5rem', padding: '0 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${NEON}40` }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
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
      style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'border-color 0.2s' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(57,255,20,0.2)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)')}
    >
      <span className="material-symbols-outlined" style={{ color: '#39ff14', marginBottom: '1rem', fontSize: '1.875rem', display: 'block' }}>{icon}</span>
      <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h4>
      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>{desc}</p>
    </div>
  )
}

function ReviewCard({ user, text, rating }: { user: string; text: string; rating?: number }) {
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
      style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontWeight: 700, color: '#39ff14', fontFamily: 'Space Grotesk, sans-serif' }}>{user}</p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>VERIFIED USER</p>
        </div>
        <div style={{ display: 'flex', color: '#39ff14' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className="material-symbols-outlined" style={{ fontSize: '0.875rem', fontVariationSettings: rating != null && s <= rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
          ))}
        </div>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>{text}</p>
    </div>
  )
}

function RelatedCard({ product, onClick }: { product: any; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="hover-glow grounded-box"
      style={{ borderRadius: '1.5rem', cursor: 'pointer', overflow: 'hidden' }}
    >
      <div style={{ aspectRatio: '16/10', position: 'relative', background: '#111' }}>
        {(product.all_images?.[0] || product.image_url || product.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.all_images?.[0] || product.image_url || product.imageUrl}
            alt={product.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.7s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.08)' }}>image_not_supported</span>
          </div>
        )}
      </div>
      <div style={{ padding: '2rem' }}>
        <p style={{ fontSize: '0.625rem', color: '#39ff14', fontWeight: 700, letterSpacing: '0.3em', marginBottom: '0.75rem', textTransform: 'uppercase' as const }}>RELATED PRODUCT</p>
        <h3 style={{ fontSize: '1.5rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#e5e2e1', marginBottom: '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name}
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.125rem' }}>
            ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              border: '1px solid rgba(57,255,20,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#39ff14',
              background: hovered ? '#39ff14' : 'transparent',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: hovered ? '#000' : '#39ff14', transition: 'color 0.2s' }}>arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  )
}
