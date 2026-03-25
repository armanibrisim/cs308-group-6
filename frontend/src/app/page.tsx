'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', color: '#e5e2e1' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'rgba(13,13,13,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: '4rem',
      }}>
        <span className="font-wide" style={{ fontSize: '1.4rem', color: '#fff', textTransform: 'uppercase', cursor: 'default' }}>
          LUMEN
        </span>

        <nav style={{ display: 'flex', gap: '2.5rem', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <button style={{ color: '#2ff801', background: 'none', border: 'none', cursor: 'pointer' }}>Explore</button>
          <button style={{ color: '#a1a1a1', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => router.push('/cart')}>Cart</button>
          <button style={{ color: '#a1a1a1', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => router.push('/orders')}>Orders</button>
        </nav>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} onClick={() => router.push('/cart')}>
            <span className="material-symbols-outlined" style={{ color: '#a1a1a1', fontSize: '20px' }}>shopping_bag</span>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} onClick={() => router.push('/login')}>
            <span className="material-symbols-outlined" style={{ color: '#a1a1a1', fontSize: '22px' }}>account_circle</span>
          </button>
        </div>
      </header>

      {/* ── Progress bar (empty) ── */}
      <div style={{ position: 'fixed', top: '4rem', left: 0, right: 0, height: '3px', zIndex: 50, background: 'rgba(255,255,255,0.05)' }} />

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
          { icon: 'shopping_bag', label: 'Cart',    path: '/cart',   active: false },
          { icon: 'receipt_long', label: 'Orders',  path: '/orders', active: false },
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

      {/* ── Main (empty) ── */}
      <main style={{
        paddingTop: '8rem', paddingBottom: '3rem',
        paddingLeft: '7rem', paddingRight: '2rem',
        maxWidth: '1440px', margin: '0 auto',
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <h1 className="font-wide" style={{
          fontSize: '6rem', fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.5em', opacity: 0.08, textAlign: 'center',
        }}>
          HOME
        </h1>
      </main>

    </div>
  )
}
