'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import styles from '../../../components/auth/AuthLayout.module.css'
import { AuthButton, AuthInput, AuthLayout, ImageSlider } from '../../../components/auth'
import { useAuth } from '../../../context/AuthContext'
import { authService } from '../../../services/authService'
import { cartService } from '../../../services/cartService'

const GUEST_CART_KEY = 'lumen_guest_cart'

interface GuestCartItem {
  id: string
  quantity: number
}

function readGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY)
    if (!raw) return []
    return JSON.parse(raw) as GuestCartItem[]
  } catch {
    return []
  }
}

function clearGuestCart(): void {
  localStorage.removeItem(GUEST_CART_KEY)
}

const slides = [
  { url: '/1.webp', slogan: 'Beyond Imagination' },
  { url: '/3.jpg', slogan: 'Elegant Design' },
  { url: '/4.webp', slogan: 'Seamless Power' },
]

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const guestItems = readGuestCart()
      const data = await authService.login({ email, password })
      login(data)
      // Merge guest cart into authenticated cart (quantities are added server-side)
      if (guestItems.length > 0) {
        clearGuestCart()
        await Promise.allSettled(
          guestItems.map((item: GuestCartItem) =>
            cartService.addItem({ product_id: item.id, quantity: item.quantity })
          )
        )
      }
      if (data.role === 'sales_manager') {
        router.push('/sales-dashboard')
      } else if (data.role === 'product_manager') {
        router.push('/products-dashboard')
      } else if (data.role === 'admin') {
        router.push('/admin-dashboard')
      } else {
        router.push('/browse')
      }
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout variant="register">
      <div className={styles.mainCard}>
        <ImageSlider slides={slides} logo="LUMEN" />

        <div className={styles.rightPanel}>
          <div className={styles.glassForm}>
            <div className={styles.formContent}>
              <h1 className={styles.title}>Welcome back</h1>
              <p className={styles.subtitle}>Sign in to continue.</p>

              <form onSubmit={handleSubmit}>
                <div className={styles.singleFieldRow}>
                  <AuthInput
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.singleFieldRow}>
                  <AuthInput
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p style={{ color: 'red', fontSize: '0.85rem', marginBottom: '8px' }}>
                    {error}
                  </p>
                )}

                <AuthButton type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </AuthButton>
              </form>

              <div className={styles.toggleText}>
                Don&apos;t have an account?
                <Link href="/register" className={styles.signUpLink}>
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
