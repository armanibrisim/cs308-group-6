'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { notificationService } from '../../services/notificationService'

const NAV_ITEMS = [
  { icon: 'home',           label: 'HOME',     path: '/',         authOnly: false },
  { icon: 'inventory_2',    label: 'PRODUCTS', path: '/browse',   authOnly: false },
  { icon: 'shopping_bag',   label: 'CART',     path: '/cart',     authOnly: false },
  { icon: 'favorite',       label: 'SAVED',    path: '/wishlist', authOnly: true  },
  { icon: 'receipt_long',   label: 'ORDERS',   path: '/orders',   authOnly: false },
  { icon: 'account_circle', label: 'PROFILE',  path: '/profile',  authOnly: true  },
] as const

export function SideNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user?.token) return
    notificationService.getNotifications(user.token)
      .then(data => setUnread(data.filter(n => !n.read).length))
      .catch(() => {})
  }, [user?.token, pathname])

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
      background: 'var(--sidenav-bg)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: '1px solid var(--sidenav-border)',
      borderRadius: '40px',
      padding: '1.8rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.8rem',
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
                color: active ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.4)',
                filter: active ? 'drop-shadow(0 0 8px rgba(var(--c-neon-rgb), 0.6))' : undefined,
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
              color: active ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.4)',
              transition: 'color 0.2s',
            }}>
              {label}
            </span>
          </button>
        )
      })}

      {/* Notification bell — only for logged-in customers */}
      {user && user.role === 'customer' && (
        <button
          onClick={() => router.push('/notifications')}
          title="NOTIFICATIONS"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            position: 'relative',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '22px',
              color: isActive('/notifications') ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.4)',
              filter: isActive('/notifications') ? 'drop-shadow(0 0 8px rgba(var(--c-neon-rgb), 0.6))' : undefined,
              transition: 'color 0.2s',
            }}
          >
            notifications
          </span>
          {unread > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--c-neon)',
              color: '#022100',
              fontSize: '8px',
              fontWeight: 900,
              borderRadius: '9999px',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          <span style={{
            fontSize: '8px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: isActive('/notifications') ? 'var(--c-neon)' : 'rgba(var(--c-text-rgb), 0.4)',
            transition: 'color 0.2s',
          }}>
            ALERTS
          </span>
        </button>
      )}
    </aside>
  )
}