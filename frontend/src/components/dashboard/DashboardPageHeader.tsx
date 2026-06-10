'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export interface DashboardPageHeaderProps {
  roleLabel: string
  roleColor: string
  title: string
  backHref: string
  badge?: ReactNode
  actions?: ReactNode
}

export function DashboardPageHeader({
  roleLabel,
  roleColor,
  title,
  backHref,
  badge,
  actions,
}: DashboardPageHeaderProps) {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
      <button
        type="button"
        onClick={() => router.push(backHref)}
        style={{
          background: 'none',
          border: '1px solid rgba(var(--c-text-rgb), 0.12)',
          borderRadius: '50%',
          width: '2.25rem',
          height: '2.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(var(--c-text-rgb), 0.5)',
          flexShrink: 0,
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => {
          const btn = e.currentTarget as HTMLButtonElement
          btn.style.borderColor = roleColor
          btn.style.color = roleColor
        }}
        onMouseLeave={e => {
          const btn = e.currentTarget as HTMLButtonElement
          btn.style.borderColor = 'rgba(var(--c-text-rgb), 0.12)'
          btn.style.color = 'rgba(var(--c-text-rgb), 0.5)'
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.6rem',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: roleColor,
            marginBottom: '0.2rem',
          }}
        >
          {roleLabel}
        </p>
        <h1
          style={{
            fontSize: '1.75rem',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--c-text)',
          }}
        >
          {title}
          {badge}
        </h1>
      </div>
      {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>{actions}</div> : null}
    </div>
  )
}

export const PRODUCT_MANAGER_HEADER = {
  roleLabel: 'Product Manager',
  roleColor: 'var(--c-neon)',
  backHref: '/products-dashboard',
} as const

export const SALES_MANAGER_HEADER = {
  roleLabel: 'Sales Manager',
  roleColor: '#f59e0b',
  backHref: '/sales-dashboard',
} as const

export const ADMIN_HEADER = {
  roleLabel: 'Admin',
  roleColor: '#ef4444',
  backHref: '/admin-dashboard',
} as const
