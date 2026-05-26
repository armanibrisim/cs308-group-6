'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface AuthUser {
  doc_id: string
  email: string
  role: string
  token: string
  first_name?: string
  last_name?: string
  tax_id?: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'lumen_user'
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const mergeMeIntoUser = useCallback((authUser: AuthUser, fresh: { first_name?: string; last_name?: string; tax_id?: string }) => {
    const updated = {
      ...authUser,
      first_name: fresh.first_name ?? authUser.first_name,
      last_name: fresh.last_name ?? authUser.last_name,
      tax_id: fresh.tax_id ?? authUser.tax_id,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setUser(updated)
    return updated
  }, [])

  const refreshFromMe = useCallback(async (authUser: AuthUser) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authUser.token}` },
      })
      if (res.ok) {
        const fresh = await res.json()
        mergeMeIntoUser(authUser, fresh)
      }
    } catch {
      // network error — keep stored data
    }
  }, [mergeMeIntoUser])

  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return
        const parsed: AuthUser = JSON.parse(stored)
        setUser(parsed)
        await refreshFromMe(parsed)
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    void init()
  }, [refreshFromMe])

  const login = useCallback((authUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
    void refreshFromMe(authUser)
  }, [refreshFromMe])

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
