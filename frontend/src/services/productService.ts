import { apiService } from './api'
import { Product, ProductCategory } from '../types/product'

// ── Simple TTL cache ─────────────────────────────────────────────────────────
const CACHE_TTL = 60_000 // 1 minute

interface CacheEntry<T> { data: T; expires: number }
const _cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = _cache.get(key)
  if (!entry || Date.now() > entry.expires) { _cache.delete(key); return null }
  return entry.data as T
}

function setCached<T>(key: string, data: T): void {
  _cache.set(key, { data, expires: Date.now() + CACHE_TTL })
}
// ─────────────────────────────────────────────────────────────────────────────

export const productService = {
  // Get all products with optional filters
  async getProducts(params?: {
    category?: string
    categoryId?: string
    search?: string
    sortBy?: 'price' | 'popularity' | 'name' | 'newest' | 'avg_rating'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }): Promise<{ products: Product[]; total: number }> {
    const queryParams = new URLSearchParams()

    if (params) {
      const { categoryId, ...rest } = params
      // categoryId maps to the backend's category_id param (direct Firestore field match)
      if (categoryId) queryParams.append('category_id', categoryId)
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString())
      })
    }

    const url = `/products?${queryParams.toString()}`
    const cached = getCached<{ products: Product[]; total: number }>(url)
    if (cached) return cached
    const data = await apiService.get<{ products: Product[]; total: number }>(url)
    setCached(url, data)
    return data
  },

  // Get a single product by ID
  async getProduct(id: string): Promise<Product> {
    const key = `/products/${id}`
    const cached = getCached<Product>(key)
    if (cached) return cached
    const data = await apiService.get<Product>(key)
    setCached(key, data)
    return data
  },

  // Get all product categories
  async getCategories(): Promise<ProductCategory[]> {
    return apiService.get<ProductCategory[]>('/categories')
  },

  // Search products
  async searchProducts(query: string): Promise<Product[]> {
    return apiService.get<Product[]>(`/products/search?q=${encodeURIComponent(query)}`)
  },
}