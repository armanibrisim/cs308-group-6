'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { icon: 'home',         label: 'HOME',     path: '/',       authOnly: false },
  { icon: 'inventory_2',  label: 'PRODUCTS', path: '/browse', authOnly: false },
  { icon: 'shopping_bag', label: 'CART',     path: '/cart',   authOnly: false },
  { icon: 'receipt_long', label: 'ORDERS',   path: '/orders', authOnly: true  },
] as const

export function SideNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const visibleItems = NAV_ITEMS.filter(item => !item.authOnly || !!user)

  return (
    <aside style={{
      position: 'fixed',
      left: '1.5rem',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 50,
      background: 'rgba(26,26,26,0.4)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '40px',
      padding: '2.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem',
      alignItems: 'center',
    }}>
      {visibleItems.map(({ icon, label, path }) => {
        const active = isActive(path)
        return (
          <button
            key={path}
            onClick={() => router.push(path)}
            title={label}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '22px',
                color: active ? '#2ff801' : '#a1a1a1',
                filter: active ? 'drop-shadow(0 0 8px rgba(47,248,1,0.6))' : undefined,
                transition: 'color 0.2s',
              }}
            >
              {icon}
            </span>
            <span style={{
              fontSize: '8px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: active ? '#2ff801' : '#a1a1a1',
              transition: 'color 0.2s',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </aside>
  )
}
