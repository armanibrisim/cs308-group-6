'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { productService } from '../services/productService'

export interface Category {
  id: string
  name: string
  count: number
}

interface CategoryContextValue {
  categories: Category[]
  isLoading: boolean
}

const CategoryContext = createContext<CategoryContextValue>({ categories: [], isLoading: true })

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    productService.getProducts({ limit: 500, page: 1 })
      .then(res => {
        const counts: Record<string, number> = {}
        for (const p of res.products) {
          const cat = (p as any).category_id || p.categoryId
          if (cat) counts[cat] = (counts[cat] || 0) + 1
        }
        const derived: Category[] = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([id, count]) => ({
            id,
            name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            count,
          }))
        setCategories(derived)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <CategoryContext.Provider value={{ categories, isLoading }}>
      {children}
    </CategoryContext.Provider>
  )
}

export function useCategories() {
  return useContext(CategoryContext)
}
