'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type CategoryItem = {
  id: string
  label: string
  href: string
  icon?: string
  match?: (args: { pathname: string; category: string | null }) => boolean
}

const ITEMS: CategoryItem[] = [
  {
    id: 'all',
    label: 'Categories',
    href: '/browse',
    icon: 'menu',
    match: ({ pathname, category }) => pathname === '/browse' && !category,
  },
  {
    id: 'components',
    label: 'PC Components',
    href: '/browse?category=components',
    match: ({ pathname, category }) => pathname === '/browse' && category === 'components',
  },
  {
    id: 'laptop-tablet',
    label: 'Laptops & Tablets',
    href: '/browse?category=laptop-tablet',
    match: ({ pathname, category }) => pathname === '/browse' && category === 'laptop-tablet',
  },
  {
    id: 'peripherals',
    label: 'Monitors & Peripherals',
    href: '/browse?category=peripherals',
    match: ({ pathname, category }) => pathname === '/browse' && category === 'peripherals',
  },
  {
    id: 'gaming',
    label: 'Gaming & Consoles',
    href: '/browse?category=gaming',
    match: ({ pathname, category }) => pathname === '/browse' && category === 'gaming',
  },
]

const DRAWER_CATEGORIES: Array<{ label: string; slug: string }> = [
  { label: 'Phones', slug: 'phones' },
  { label: 'Computers', slug: 'computers' },
  { label: 'PC Components', slug: 'components' },
  { label: 'Laptops & Tablets', slug: 'laptop-tablet' },
  { label: 'Monitors & Peripherals', slug: 'peripherals' },
  { label: 'Gaming & Consoles', slug: 'gaming' },
  { label: 'Audio', slug: 'audio' },
  { label: 'Smart Home', slug: 'smart-home' },
  { label: 'Deals', slug: 'deals' },
]

export function CategoryBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const [isOpen, setIsOpen] = useState(false)
  const triggerBarRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target
      if (!(target instanceof Node)) return

      const triggerEl = triggerBarRef.current
      const drawerEl = drawerRef.current

      const clickedInsideTrigger = triggerEl?.contains(target) ?? false
      const clickedInsideDrawer = drawerEl?.contains(target) ?? false

      if (!clickedInsideTrigger && !clickedInsideDrawer) setIsOpen(false)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('keydown', onKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <div
      style={{
        position: 'fixed',
        top: '4rem',
        left: 0,
        right: 0,
        zIndex: 55,
        height: '3rem',
        background: '#f5f6f7',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div
        ref={triggerBarRef}
        className="hide-scrollbar"
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          height: '100%',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
        }}
      >
        {ITEMS.map((item) => {
          const isActive = item.match?.({ pathname, category }) ?? false
          const isCategoriesTrigger = item.id === 'all'
          const isTriggerActive = isCategoriesTrigger && isOpen
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (isCategoriesTrigger) {
                  setIsOpen((v) => !v)
                  return
                }
                setIsOpen(false)
                router.push(item.href)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: '2.25rem',
                padding: '0 0.75rem',
                background: isActive || isTriggerActive ? 'rgba(0,0,0,0.06)' : 'transparent',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                color: isActive || isTriggerActive ? '#111' : '#2b2b2b',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isTriggerActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
              }}
              onMouseLeave={(e) => {
                if (!isActive && !isTriggerActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {item.icon ? (
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {item.icon}
                </span>
              ) : null}
              <span style={{ borderBottom: isActive ? '2px solid rgba(0,0,0,0.6)' : '2px solid transparent', paddingBottom: '2px' }}>
                {item.label}
              </span>
              {isCategoriesTrigger ? (
                <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.8 }}>
                  expand_more
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="All Categories"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div
            ref={drawerRef}
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: 'min(420px, 92vw)',
              background: '#fff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
              padding: '1.25rem 1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span className="font-wide" style={{ color: '#d30000', fontSize: '1.35rem' }}>
                LUMEN
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close categories panel"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4a4a' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.2)', marginBottom: '1.1rem' }} />

            <h3 style={{ color: '#2b2b2b', fontSize: '1.9rem', marginBottom: '1rem', fontWeight: 800 }}>All Categories</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {DRAWER_CATEGORIES.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    router.push(`/browse?category=${item.slug}`)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.82rem 0.6rem',
                    cursor: 'pointer',
                    color: '#3a3a3a',
                    fontSize: '1.02rem',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span>{item.label}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#666' }}>
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

