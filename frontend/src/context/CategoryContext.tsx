'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { productService } from '../services/productService'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface Category {
  id: string
  name: string
  count: number
  icon?: string | null
  parent_category_id?: string | null
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
    Promise.allSettled([
      fetch(`${API}/categories`).then(r => r.json()),
      productService.getProducts({ limit: 500, page: 1 }),
    ]).then(([catsResult, prodsResult]) => {
      const counts: Record<string, number> = {}
      const names: Record<string, string> = {}

      // Ürünlerden kategori sayılarını ve ID'den türetilmiş isimlerini hesapla
      if (prodsResult.status === 'fulfilled') {
        for (const p of prodsResult.value.products) {
          const cat = (p as any).category_id || p.categoryId
          if (cat) {
            counts[cat] = (counts[cat] || 0) + 1
            if (!names[cat]) {
              names[cat] = cat.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            }
          }
        }
      }

      // API'den gelen formal kategorileri ekle / isimlerini güncelle
      if (catsResult.status === 'fulfilled' && Array.isArray(catsResult.value)) {
        for (const c of catsResult.value) {
          names[c.id] = c.name          // Gerçek isim varsa üzerine yaz
          if (counts[c.id] === undefined) counts[c.id] = 0  // Ürünü olmasa da göster
        }
      }

      const icons: Record<string, string | null> = {}
      const parents: Record<string, string | null> = {}
      if (catsResult.status === 'fulfilled' && Array.isArray(catsResult.value)) {
        for (const c of catsResult.value) {
          if (c.icon) icons[c.id] = c.icon
          parents[c.id] = c.parent_category_id ?? null
        }
      }

      const derived: Category[] = Object.keys(names)
        .map(id => ({ id, name: names[id], count: counts[id] ?? 0, icon: icons[id] ?? null, parent_category_id: parents[id] ?? null }))
        .sort((a, b) => b.count - a.count)

      setCategories(derived)
    }).finally(() => setIsLoading(false))
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
