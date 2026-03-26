'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const heroSlides = [
  {
    id: 'ai-laptop',
    label: 'LIMITED DROP',
    title: 'PRESTIGE 16 AI PRO XTREME',
    subtitle: 'High-performance creator laptop for next-gen workflows.',
    features: ['Intel Core Ultra', '64GB LPDDR5X', '4K 120Hz Mini-LED', '2TB Gen4 SSD'],
  },
  {
    id: 'gaming-rig',
    label: 'NEW ARRIVAL',
    title: 'LUMEN GAMING RIG X9',
    subtitle: 'Desktop-class gaming power tuned for competitive play.',
    features: ['RTX Series GPU', '240Hz Ready', 'Liquid Cooling', 'Wi-Fi 7'],
  },
  {
    id: 'creator-monitor',
    label: 'PRO DISPLAY',
    title: 'VISION 34 ULTRAWIDE',
    subtitle: 'Color-accurate panel built for creators and professionals.',
    features: ['34" Curved', 'HDR Support', 'USB-C Dock', 'Factory Calibrated'],
  },
]

const campaignCards = [
  {
    id: 'weekly',
    title: 'Weekly Deals',
    description: 'Fresh discounts on top hardware every week.',
    cta: 'Explore Deals',
  },
  {
    id: 'gaming',
    title: 'Gaming Setup Picks',
    description: 'Curated bundles for high-FPS competitive gaming.',
    cta: 'Build Setup',
  },
  {
    id: 'students',
    title: 'Student Essentials',
    description: 'Portable and affordable picks for study life.',
    cta: 'View Picks',
  },
]

const trustItems = ['Free Shipping', 'Secure Checkout', 'Easy Returns', '24/7 Support']

export default function HomePage() {
  const router = useRouter()
  const [activeSlide, setActiveSlide] = useState(0)

  const prevSlide = () => {
    setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length)
  }

  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % heroSlides.length)
  }

  const slide = heroSlides[activeSlide]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', color: '#e5e2e1' }}>
      {/* ── Side nav ── */}
      <aside style={{
        position: 'fixed', left: '1.5rem', top: '50%', transform: 'translateY(-50%)',
        zIndex: 50, background: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px',
        padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', alignItems: 'center',
      }}>
        {([
          { icon: 'home',         label: 'Home',    path: '/',        active: true  },
          { icon: 'inventory_2',  label: 'Product', path: '/browse', active: false },
        ] as const).map(({ icon, label, path, active }) => (
          <button key={label} onClick={() => router.push(path)} title={label}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{
              fontSize: '22px',
              color: active ? '#2ff801' : '#a1a1a1',
              filter: active ? 'drop-shadow(0 0 8px rgba(47,248,1,0.6))' : undefined,
            }}>{icon}</span>
            <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: active ? '#2ff801' : '#a1a1a1' }}>
              {label}
            </span>
          </button>
        ))}
      </aside>

      {/* ── Main showcase content ── */}
      <main style={{
        paddingTop: '2rem', paddingBottom: '3rem',
        paddingLeft: '7rem', paddingRight: '2rem',
        maxWidth: '1440px', margin: '0 auto',
        minHeight: 'calc(100vh - 7rem)',
        display: 'flex', flexDirection: 'column', gap: '1.75rem',
      }}>
        {/* HeroCampaignSlider */}
        <section
          className="glass-panel"
          style={{
            borderRadius: '24px',
            minHeight: '460px',
            overflow: 'hidden',
            position: 'relative',
            background:
              'linear-gradient(105deg, rgba(2,16,34,0.95) 0%, rgba(3,22,47,0.86) 45%, rgba(7,31,52,0.72) 60%, rgba(10,38,60,0.42) 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 20% 30%, rgba(47,248,1,0.12), transparent 42%), radial-gradient(circle at 80% 60%, rgba(96,165,250,0.18), transparent 42%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1, padding: '2.25rem', maxWidth: '560px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.3em', fontWeight: 800, color: '#2ff801', marginBottom: '0.85rem' }}>
              {slide.label}
            </p>
            <h1 className="font-wide" style={{ fontSize: '2.4rem', lineHeight: 1.04, marginBottom: '0.9rem', textTransform: 'uppercase' }}>
              {slide.title}
            </h1>
            <p style={{ color: 'rgba(229,226,225,0.8)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>{slide.subtitle}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {slide.features.map((feature) => (
                <div key={feature} style={{ fontSize: '0.82rem', color: '#d9d9d9' }}>
                  {feature}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.push('/browse')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '9999px',
                  padding: '0.75rem 1.25rem',
                  background: '#2ff801',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Shop Now
              </button>
              <button
                type="button"
                onClick={() => router.push('/browse')}
                style={{
                  border: '1px solid rgba(255,255,255,0.28)',
                  cursor: 'pointer',
                  borderRadius: '9999px',
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                View Details
              </button>
            </div>
          </div>
          <div style={{ position: 'absolute', right: '1.1rem', bottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 2 }}>
            <button type="button" onClick={prevSlide} style={{ width: '36px', height: '36px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {heroSlides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setActiveSlide(index)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    background: index === activeSlide ? '#fff' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </div>
            <button type="button" onClick={nextSlide} style={{ width: '36px', height: '36px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>
        </section>

        {/* CampaignHighlights */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {campaignCards.map((card) => (
            <article key={card.id} className="glass-panel" style={{ borderRadius: '20px', padding: '1rem' }}>
              <div style={{ height: '120px', borderRadius: '14px', marginBottom: '0.85rem', background: 'linear-gradient(130deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))' }} />
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.45rem', color: '#fff', fontWeight: 700 }}>{card.title}</h3>
              <p style={{ fontSize: '0.86rem', color: 'rgba(229,226,225,0.72)', marginBottom: '0.8rem' }}>{card.description}</p>
              <button type="button" onClick={() => router.push('/browse')} style={{ background: 'none', border: 'none', padding: 0, color: '#2ff801', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                {card.cta}
              </button>
            </article>
          ))}
        </section>

        {/* FeaturedProductsPlaceholder */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.95rem', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 className="font-wide" style={{ fontSize: '1.2rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Featured Products
            </h2>
            <button type="button" onClick={() => router.push('/browse')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '9999px', color: '#fff', padding: '0.5rem 0.9rem', cursor: 'pointer', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              See all products
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1rem',
            }}
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <article key={`slot-${index}`} className="glass-panel" style={{ borderRadius: '18px', padding: '0.9rem' }}>
                <div style={{ height: '145px', borderRadius: '12px', marginBottom: '0.75rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))' }} />
                <div style={{ height: '12px', borderRadius: '9999px', width: '72%', marginBottom: '0.55rem', background: 'rgba(255,255,255,0.16)' }} />
                <div style={{ height: '10px', borderRadius: '9999px', width: '44%', marginBottom: '0.85rem', background: 'rgba(255,255,255,0.11)' }} />
                <div style={{ height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.09)' }} />
              </article>
            ))}
          </div>
        </section>

        {/* TrustStrip */}
        <section className="glass-panel" style={{ borderRadius: '16px', padding: '0.9rem 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
            {trustItems.map((item) => (
              <div key={item} style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#d5d5d5', letterSpacing: '0.05em' }}>
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>

    </div>
  )
}
