'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TopHeader() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        backgroundColor: '#0d0d0d',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        height: '4rem',
      }}
    >
      <div style={{ width: '160px', display: 'flex', alignItems: 'center' }}>
        <span
          className="font-wide"
          style={{
            fontSize: '1.4rem',
            color: '#fff',
            textTransform: 'uppercase',
            cursor: 'default',
            whiteSpace: 'nowrap',
          }}
        >
          LUMEN
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            // Enable this if /browse supports query params:
            // router.push(`/browse?search=${encodeURIComponent(query)}`)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
            borderRadius: '9999px',
            padding: '0.35rem 0.35rem 0.35rem 1rem',
            width: 'min(520px, 46vw)',
            minWidth: 0,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, categories, or brands"
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              minWidth: 0,
              fontSize: '14px',
              color: '#111',
              background: 'transparent',
            }}
          />
          <button
            type="submit"
            aria-label="Search"
            style={{
              width: '44px',
              height: '36px',
              borderRadius: '9999px',
              border: 'none',
              background: '#111',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '20px' }}>
              search
            </span>
          </button>
        </form>
      </div>

      <div
        style={{
          width: '160px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
          onClick={() => router.push('/cart')}
        >
          <span className="material-symbols-outlined" style={{ color: '#a1a1a1', fontSize: '20px' }}>
            shopping_bag
          </span>
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
          onClick={() => router.push('/login')}
        >
          <span className="material-symbols-outlined" style={{ color: '#a1a1a1', fontSize: '22px' }}>
            account_circle
          </span>
        </button>
      </div>
    </header>
  )
}

