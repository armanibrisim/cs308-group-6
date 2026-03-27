'use client'

import { SideNav } from '../../../components/layout/SideNav'

export default function OrdersPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080808', color: '#e5e2e1' }}>
      <SideNav />

      <main style={{
        paddingTop: '0', paddingBottom: '3rem',
        paddingLeft: '9rem', paddingRight: '2rem',
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <h1 className="font-wide" style={{
          fontSize: '6rem', fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.5em', opacity: 0.08, textAlign: 'center',
        }}>
          ORDERS
        </h1>
      </main>
    </div>
  )
}
