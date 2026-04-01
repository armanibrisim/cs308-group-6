'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface AuthUser {
  doc_id: string
  email: string
  role: string
  token: string
  first_name?: string
  last_name?: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'lumen_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return
        const parsed: AuthUser = JSON.parse(stored)
        setUser(parsed)

        // Refresh first_name/last_name from backend in case profile was updated
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`,
            { headers: { Authorization: `Bearer ${parsed.token}` } }
          )
          if (res.ok) {
            const fresh = await res.json()
            const updated = { ...parsed, first_name: fresh.first_name, last_name: fresh.last_name }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            setUser(updated)
          }
        } catch {
          // network error — keep stored data
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const login = useCallback((authUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
