'use client'

import { useState, useRef, MouseEvent, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productService } from '../../../../services/productService'

const NEON = '#39ff14'

const thumbnailImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDFlJPR6RGSP8R1LIbH_bWoHkUV94mfw52qQMODYY401BjUgTAV0EbuWyyTDUmQsSIUa-WeMhG37TEZH4cyaCh_kkqrUNcXLvCiV7itzQTy1TJPMv6zmGDIbVvgQuaM47Y0inBoTQx_vXsdIBR3bqkTpIMyBRG-ZN2WIY66Xq5OiFPiIvFQMv11draF3wZ8rfzCJdOmv-rlZqYpewMm7gakdccmgMtnFT2q8LkoqxH9jv3MGnqetiexRaT1Orr7Ej4Wuq-vw_sGuLI',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCrLDRmURjam4tqyhAPxLznkvmZhvL-gJl2SrP1rTgg0nFXX6hy0WcXe3YiXAG4MWY9uybIO26mmgNG_8gcLCwDGVNZZ_vZhng3iu_kbAdCWeugbG40WKle-aiecoD6BJIY_FqTNVZ4eoD1-RjtdV4Rtjne9nnNr-VxZk9NfvQt4rp1juq4DITIiJMBBuL_Ozwv8Ww0sQ2p0Pz4bvWPEYA2un-1N8sz8wUW2DdOxtFIXA9OE36N8keOsVE2TiujO9-FK6T2xRzX910',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDpOgke-aTDTXgRhvUbIr69JeUADOiy_ZZvYmizJdLOglaXCpOKuiiSKkClbTw0Gk6RQhYBW60Fkhuuo0bAO3OaHDKI9PhVhW3tlB5zIOpmC4QJYaTR1Rh0e-sqxqkkYk49-R3aRGdh2K6M7-8_UR4KSGA0TrxUsXOK59tM6P9zR7Nf98oWRweCtBrGbmAl31WR4L5yjTY_y_VvCBnwa4ENLCWS7Synb-6XJuba9BKMuwh225HXaWMR_nlvIe0vsDoUfHdq0tyVWzA',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ-SZZyix82Taa7DOs7fVkKVuYqJJk6_fJjxYPWs7ZKuSzZZuEdqfRz79mLhykKDY6xTvKoo2yOmGtPt22x7Lgt3P8UKRFYhhy0jpJqQIiYGwG9ejeJcOI075CCWg31K7E8sB1UYdjGqvgv_4yDsi9uM_zVokyusMr0-mZUNbkjc1TA76hg5BQdRujOdYO8DB4kB9ldxdoIkFRP32aQiEiR_WmpwQ_vmSGZQn9L45yJFkbYogAZQWpBOgCr2vZ2aVhR98_yx2aw2A',
]



const tabs = [
  { id: 'desc', label: 'PRODUCT DESCRIPTION' },
  { id: 'specs', label: 'TECHNICAL SPECS' },
  { id: 'reviews', label: 'USER REVIEWS' },
  { id: 'returns', label: 'RETURN POLICY' },
]

function GlowBox({
  children,
  style,
  className,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
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
      className={className}
      style={{
        background: 'rgba(17, 17, 17, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('desc')
  const [showCatalogue, setShowCatalogue] = useState(false)
  const [imageOpacity, setImageOpacity] = useState(1)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [thumbnails, setThumbnails] = useState<string[]>(thumbnailImages)
  const [mainImage, setMainImage] = useState(thumbnails[0])
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])

  useEffect(() => {
    if (!id) return;
    productService.getProduct(id)
      .then(data => {
        setProduct(data)
        const img = (data as any).image_url || (data as any).imageUrl
        if (img) {
          setThumbnails([img])
          setMainImage(img)
        }
        
        // Fetch related products
        const catId = (data as any).category_id || (data as any).categoryId
        if (catId) {
          productService.getProducts({ category: catId, limit: 8 })
            .then(res => {
              const related = res.products.filter(p => p.id !== data.id)
              setRelatedProducts(related)
            })
            .catch(err => console.error("Failed to fetch related", err))
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [id])

  const switchImage = (src: string) => {
    setImageOpacity(0)
    setTimeout(() => {
      setMainImage(src)
      setImageOpacity(1)
    }, 300)
  }

  const navigateImage = (direction: number) => {
    const currentIndex = thumbnails.indexOf(mainImage)
    const nextIndex = (currentIndex + direction + thumbnails.length) % thumbnails.length
    switchImage(thumbnails[nextIndex])
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#080808', color: '#e5e2e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading product metrics...</div>
  }

  if (!product) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#080808', color: '#e5e2e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Entity not found context.</div>
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#080808',
        color: '#e5e2e1',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* ── Main Content ── */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          paddingBottom: '6rem',
          paddingLeft: '2rem',
          paddingRight: '2rem',
          maxWidth: '1920px',
          margin: '0 auto',
        }}
      >
        {/* ── Product Grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '4rem',
            alignItems: 'start',
          }}
        >
          {/* ── Left: Image Gallery ── */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Main image */}
            <GlowBox
              style={{ borderRadius: '1.5rem', aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div
                style={{ position: 'relative', width: '100%', height: '100%' }}
                className="group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImage}
                  alt="Product"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: imageOpacity,
                    transition: 'opacity 0.3s ease, transform 0.7s ease',
                    borderRadius: '1.5rem',
                  }}
                />
                {/* Navigation arrows */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    zIndex: 20,
                  }}
                  className="group-hover-visible"
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '1')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '0')}
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
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>chevron_left</span>
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
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>chevron_right</span>
                  </button>
                </div>
                {/* Hover reveal overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    cursor: 'pointer',
                    borderRadius: '1.5rem',
                  }}
                  onMouseEnter={(e) => {
                    const arrows = e.currentTarget.previousElementSibling as HTMLElement
                    if (arrows) arrows.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    const arrows = e.currentTarget.previousElementSibling as HTMLElement
                    if (arrows) arrows.style.opacity = '0'
                  }}
                />
              </div>
            </GlowBox>

            {/* Thumbnails */}
            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                overflowX: 'auto',
                paddingBottom: '1rem',
              }}
            >
              {thumbnails.map((src, i) => (
                <div
                  key={i}
                  onClick={() => switchImage(src)}
                  style={{
                    width: '8rem',
                    aspectRatio: '1',
                    borderRadius: '1rem',
                    border: `2px solid ${src === mainImage ? NEON : 'rgba(255,255,255,0.05)'}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: 'pointer',
                    background: '#111',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${product?.name} Image ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Product Info Card ── */}
          <div style={{ gridColumn: 'span 4', position: 'sticky', top: '8rem' }}>
            <GlowBox style={{ padding: '2.5rem', borderRadius: '1.5rem' }}>
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    background: `${NEON}33`,
                    color: NEON,
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontFamily: 'Space Grotesk, Inter, sans-serif',
                  }}
                >
                  FLAGSHIP SERIES
                </span>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontFamily: 'Space Grotesk, Inter, sans-serif',
                  }}
                >
                  IN STOCK
                </span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: '2.5rem',
                  fontFamily: 'Space Grotesk, Inter, sans-serif',
                  fontWeight: 700,
                  color: '#e5e2e1',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  marginBottom: '1rem',
                }}
              >
                {product?.name || 'UNKNOWN ENTITY'}
              </h1>

              {/* Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: NEON }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                  ))}
                  <span style={{ fontSize: '1.125rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginLeft: '0.5rem' }}>
                    5.0
                  </span>
                </div>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.75rem',
                    fontFamily: 'Inter, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    paddingLeft: '1.5rem',
                  }}
                >
                  842 DEPLOYMENTS
                </span>
              </div>

              {/* Price */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '3.5rem',
                      fontFamily: 'Space Grotesk, Inter, sans-serif',
                      fontWeight: 300,
                      letterSpacing: '-0.03em',
                      color: '#fff',
                    }}
                  >
                    ${Math.floor(product?.price || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    .{((product?.price || 0) % 1).toFixed(2).substring(2)}
                  </span>
                </div>
                <p
                  style={{
                    color: `${NEON}99`,
                    fontSize: '0.75rem',
                    marginTop: '0.75rem',
                    letterSpacing: '0.2em',
                    fontFamily: 'Inter, sans-serif',
                    textTransform: 'uppercase',
                  }}
                >
                  ULTRA-PERFORMANCE GUARANTEED
                </p>
              </div>

              {/* CTA Button */}
              <button
                style={{
                  width: '100%',
                  background: NEON,
                  color: '#000',
                  fontFamily: 'Space Grotesk, Inter, sans-serif',
                  fontWeight: 700,
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  fontSize: '0.875rem',
                  letterSpacing: '0.3em',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginBottom: '2rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(57,255,20,0.3)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                }}
              >
                INITIALIZE PURCHASE
                <span className="material-symbols-outlined">bolt</span>
              </button>

              {/* Secondary actions */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  paddingTop: '2rem',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
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
                      border: i === 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      borderTop: 'none',
                      borderBottom: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                      padding: '0.5rem',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = NEON)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>{action.icon}</span>
                    <span style={{ fontSize: '0.5625rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.2em' }}>
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </GlowBox>
          </div>
        </div>

        {/* ── Tabs Section ── */}
        <section style={{ marginTop: '8rem' }}>
          {/* Tab triggers */}
          <div
            style={{
              display: 'flex',
              gap: '3rem',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '3rem',
              overflowX: 'auto',
              paddingLeft: '1rem',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  paddingBottom: '1.5rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Space Grotesk, Inter, sans-serif',
                  letterSpacing: '0.3em',
                  color: activeTab === tab.id ? NEON : 'rgba(255,255,255,0.4)',
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: '2px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: activeTab === tab.id ? NEON : 'transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s ease',
                }}
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
                <h3
                  style={{
                    fontSize: '1.875rem',
                    fontFamily: 'Space Grotesk, Inter, sans-serif',
                    fontWeight: 700,
                    color: NEON,
                    marginBottom: '1.5rem',
                  }}
                >
                  NEXT-GEN COMPUTING ARCHITECTURE
                </h3>
                <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, fontWeight: 300, marginBottom: '2rem', whiteSpace: 'pre-line' }}>
                  {product?.description}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '3rem' }}>
                  {[
                    { icon: 'ac_unit', title: 'Zero-Thermal Tech', desc: 'Advanced cryo-loop technology maintaining sub-30°C under peak loads.' },
                    { icon: 'neurology', title: 'Neural Linkage', desc: 'AI-driven overclocking that adapts to your specific application needs.' },
                    { icon: 'speed', title: 'Instant-Boot', desc: 'Sub-3 second cold boot via Quantum NVMe architecture.' },
                  ].map((feature) => (
                    <div
                      key={feature.icon}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: NEON, marginBottom: '1rem', fontSize: '1.875rem', display: 'block' }}>
                        {feature.icon}
                      </span>
                      <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>{feature.title}</h4>
                      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specs */}
            {activeTab === 'specs' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3rem 5rem' }}>
                {[
                  { label: 'MODEL', name: product?.model || 'N/A', detail: product?.serial_number || product?.serialNumber || 'N/A' },
                  { label: 'WARRANTY', name: product?.warranty || 'Standard', detail: 'Conditions Apply' },
                  { label: 'DISTRIBUTOR', name: product?.distributor || 'LUMEN DIRECT', detail: 'Verified Partner' },
                  { label: 'STOCK STATUS', name: (product?.stock_quantity || product?.stockQuantity || 0) > 0 ? 'AVAILABLE' : 'DEPLEATED', detail: `${product?.stock_quantity || product?.stockQuantity || 0} units active` },
                ].map((spec) => (
                  <div key={spec.label}>
                    <p style={{ fontSize: '0.75rem', color: NEON, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.3em', marginBottom: '0.5rem', fontWeight: 700 }}>
                      {spec.label}
                    </p>
                    <p style={{ fontSize: '1.25rem', fontFamily: 'Space Grotesk, sans-serif', color: '#fff', fontWeight: 300 }}>
                      {spec.name}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                      {spec.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>SYSTEM FEEDBACK</h3>
                  <button
                    style={{
                      padding: '0.5rem 1.5rem',
                      border: `1px solid ${NEON}4D`,
                      color: NEON,
                      fontSize: '0.75rem',
                      letterSpacing: '0.2em',
                      background: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${NEON}1A`)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                  >
                    WRITE A LOG
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                  {[
                    { user: 'VERTEX_COMMANDER', text: '"Absolute beast. The render times on 8K raw footage are virtually nonexistent now. Best investment for our studio."' },
                    { user: 'NOVA_STRIDER', text: '"The aesthetic alone is worth it, but the thermal management is what really shines. Quiet as a whisper even under heavy load."' },
                  ].map((review) => (
                    <div
                      key={review.user}
                      style={{
                        padding: '2rem',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <p style={{ fontWeight: 700, color: NEON }}>{review.user}</p>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>VERIFIED USER</p>
                        </div>
                        <div style={{ display: 'flex', color: NEON }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>star</span>
                          ))}
                        </div>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>{review.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Returns */}
            {activeTab === 'returns' && (
              <div style={{ maxWidth: '42rem' }}>
                <h3 style={{ fontSize: '1.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: NEON, marginBottom: '1.5rem' }}>
                  QUANTUM WARRANTY &amp; RETURNS
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {[
                    { icon: 'verified', text: '30-Day Hassle-Free System Return Policy.' },
                    { icon: 'shield', text: '3-Year Standard Quantum Hardware Warranty included.' },
                    { icon: 'support_agent', text: '24/7 Priority Technician Access for hardware failure.' },
                    { icon: 'local_shipping', text: 'Free return shipping on all defective components.' },
                  ].map((item) => (
                    <li key={item.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}>
                      <span className="material-symbols-outlined" style={{ color: NEON }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GlowBox>
        </section>

        {/* ── Related Products Section ── */}
        <section style={{ marginTop: '8rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontFamily: 'Space Grotesk, Inter, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '3rem', color: '#e5e2e1' }}>
            CO-ORDINATED SYSTEMS
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
            {relatedProducts.slice(0, 3).map((product) => (
              <GlowBox key={product.id} style={{ borderRadius: '1.5rem', cursor: 'pointer' }}>
                <div onClick={() => router.push(`/product/${product.id}`)} style={{ aspectRatio: '16/10', position: 'relative', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {product.image_url || product.imageUrl ? (
                    <img
                      src={product.image_url || product.imageUrl}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1s ease' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.1)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))' }} />
                  )}
                </div>
                <div style={{ padding: '2rem' }}>
                  <p style={{ fontSize: '0.625rem', color: NEON, fontWeight: 700, letterSpacing: '0.3em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                    RELATED PRODUCT
                  </p>
                  <h3 style={{ fontSize: '1.5rem', fontFamily: 'Space Grotesk, Inter, sans-serif', fontWeight: 700, color: '#e5e2e1', marginBottom: '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                        border: `1px solid ${NEON}4D`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: NEON,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLDivElement).style.background = NEON
                        ;(e.currentTarget as HTMLDivElement).style.color = '#000'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLDivElement).style.color = NEON
                      }}
                    >
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                </div>
              </GlowBox>
            ))}
          </div>

          {/* Expanded catalogue */}
          {showCatalogue && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '2.5rem',
                marginTop: '3rem',
                opacity: 1,
                transition: 'opacity 1s ease',
              }}
            >
              {relatedProducts.slice(3, 7).map((product) => (
                <GlowBox key={product.id} style={{ borderRadius: '1.5rem', cursor: 'pointer' }}>
                  <div onClick={() => router.push(`/product/${product.id}`)} style={{ aspectRatio: '16/10', position: 'relative', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {product.image_url || product.imageUrl ? (
                      <img
                        src={product.image_url || product.imageUrl}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1s ease' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.1)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))' }} />
                    )}
                  </div>
                  <div style={{ padding: '2rem' }}>
                    <p style={{ fontSize: '0.625rem', color: NEON, fontWeight: 700, letterSpacing: '0.3em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                      RELATED PRODUCT
                    </p>
                    <h3 style={{ fontSize: '1.5rem', fontFamily: 'Space Grotesk, Inter, sans-serif', fontWeight: 700, color: '#e5e2e1', marginBottom: '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {product.name}
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.125rem' }}>
                        ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div
                        onClick={(e) => { e.stopPropagation(); router.push(`/product/${product.id}`) }}
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '50%',
                          border: `1px solid ${NEON}4D`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: NEON,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLDivElement).style.background = NEON
                          ;(e.currentTarget as HTMLDivElement).style.color = '#000'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                          ;(e.currentTarget as HTMLDivElement).style.color = NEON
                        }}
                      >
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </GlowBox>
              ))}
            </div>
          )}

          {/* Browse Catalogue button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5rem' }}>
            <button
              onClick={() => setShowCatalogue(true)}
              style={{
                padding: '1rem 4rem',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontFamily: 'Space Grotesk, Inter, sans-serif',
                letterSpacing: '0.5em',
                color: 'rgba(255,255,255,0.6)',
                background: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
      <footer
        style={{
          marginTop: '8rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: '5rem',
          paddingBottom: '5rem',
          background: '#080808',
        }}
      >
        <div
          style={{
            maxWidth: '1920px',
            margin: '0 auto',
            padding: '0 2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.05em', color: '#9ca3af', fontFamily: 'Space Grotesk, Inter, sans-serif' }}>
              LUMEN
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 1.75 }}>
              Pioneering the future of computational hardware. Engineered for the enthusiasts, the creators, and the visionaries.
            </p>
          </div>

          {[
            {
              title: 'Systems',
              links: ['Neon Series', 'Quantum Series', 'Workstation Pro', 'Custom Build'],
            },
            {
              title: 'Support',
              links: ['Technical Logs', 'Deployment Status', 'Firmware Updates', 'Global Network'],
            },
          ].map((col) => (
            <div key={col.title}>
              <h5 style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.75rem', marginBottom: '2rem', textTransform: 'uppercase' }}>
                {col.title}
              </h5>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = NEON)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)')}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h5 style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.75rem', marginBottom: '2rem', textTransform: 'uppercase' }}>
              Newsletter
            </h5>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="ACCESS_ID@MAIL.COM"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.75rem',
                  flex: 1,
                  color: '#fff',
                  outline: 'none',
                }}
              />
              <button
                style={{
                  background: NEON,
                  color: '#000',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
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
