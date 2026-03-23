'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import styles from '../../../components/auth/AuthLayout.module.css'
import { AuthButton, AuthInput, AuthLayout, ImageSlider } from '../../../components/auth'
import { useAuth } from '../../../context/AuthContext'
import { authService } from '../../../services/authService'

const slides = [
  { url: '/4.webp', slogan: 'Seamless Power' },
  { url: '/3.jpg', slogan: 'Elegant Design' },
  { url: '/2.webp', slogan: 'Infinite Visuals' },
  { url: '/1.webp', slogan: 'Beyond Imagination' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const data = await authService.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      })
      login(data)
      router.push('/browse')
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('409')) {
        setError('This email is already registered.')
      } else {
        setError('Registration failed. Please try again.')
      }
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
              <h1 className={styles.title}>Create account</h1>
              <p className={styles.subtitle}>Start your journey today.</p>

              <form onSubmit={handleSubmit}>
                <div className={styles.nameRow}>
                  <AuthInput
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <AuthInput
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

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

                <div className={styles.singleFieldRow}>
                  <AuthInput
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p style={{ color: 'red', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</p>}

                <AuthButton type="submit" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                </AuthButton>
              </form>

              <div className={styles.toggleText}>
                Already have an account?
                <button type="button" onClick={() => router.push('/login')}>
                  Log In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
