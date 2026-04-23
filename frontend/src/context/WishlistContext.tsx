'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { wishlistService } from '../services/wishlistService'

interface WishlistContextValue {
  savedIds: Set<string>
  toggle: (productId: string) => Promise<void>
  isSaved: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Fetch wishlist whenever the user changes
  useEffect(() => {
    if (!user?.token) {
      setSavedIds(new Set())
      return
    }
    wishlistService.getWishlist(user.token)
      .then(({ product_ids }) => setSavedIds(new Set(product_ids)))
      .catch(() => {})
  }, [user?.token])

  const toggle = useCallback(async (productId: string) => {
    if (!user?.token) return

    const alreadySaved = savedIds.has(productId)

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev)
      alreadySaved ? next.delete(productId) : next.add(productId)
      return next
    })

    try {
      const { product_ids } = alreadySaved
        ? await wishlistService.removeFromWishlist(productId, user.token)
        : await wishlistService.addToWishlist(productId, user.token)
      setSavedIds(new Set(product_ids))
    } catch {
      // revert on failure
      setSavedIds(prev => {
        const next = new Set(prev)
        alreadySaved ? next.add(productId) : next.delete(productId)
        return next
      })
    }
  }, [user?.token, savedIds])

  const isSaved = useCallback((productId: string) => savedIds.has(productId), [savedIds])

  return (
    <WishlistContext.Provider value={{ savedIds, toggle, isSaved }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}
