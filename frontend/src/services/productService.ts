import { apiService } from './api'
import { Product, ProductCategory } from '../types/product'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

/** Body for POST /products (matches backend ProductCreate). */
export interface ProductCreatePayload {
  name: string
  model: string
  serial_number: string
  description: string
  stock_quantity: number
  price: number
  warranty: string
  distributor: string
  category_id: string
  image_url?: string | null
}

/** Dropdown option for product forms (normalized from /categories or product rows). */
export interface CategoryOption {
  id: string
  name: string
}

function formatCategoryIdLabel(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function normalizeCategoryItem(item: unknown): CategoryOption | null {
  if (!item || typeof item !== 'object') return null
  const o = item as Record<string, unknown>
  const id = o.id
  const name = o.name
  if (typeof id !== 'string' || !id.trim()) return null
  if (typeof name === 'string' && name.trim()) return { id: id.trim(), name: name.trim() }
  return { id: id.trim(), name: formatCategoryIdLabel(id.trim()) }
}

function dedupeCategoryOptions(opts: CategoryOption[]): CategoryOption[] {
  const seen = new Set<string>()
  return opts.filter(x => {
    if (seen.has(x.id)) return false
    seen.add(x.id)
    return true
  })
}

function formatApiDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((e: { msg?: string }) => e.msg ?? JSON.stringify(e))
      .join('; ')
  }
  return 'Request failed'
}

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

/** Clear cached product list/detail after mutations (e.g. create). */
export function invalidateProductsCache(): void {
  for (const key of [..._cache.keys()]) {
    if (key.startsWith('/products')) _cache.delete(key)
  }
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

  /**
   * Categories for forms: uses GET /categories when non-empty; otherwise unique
   * category_id values from products (Firestore often has products but no category docs).
   */
  async getCategoryOptionsWithFallback(): Promise<{
    options: CategoryOption[]
    source: 'categories' | 'products_fallback'
  }> {
    let raw: unknown[] = []
    try {
      const res = await apiService.get<unknown[]>('/categories')
      raw = Array.isArray(res) ? res : []
    } catch {
      raw = []
    }

    const fromApi = dedupeCategoryOptions(
      raw.map(normalizeCategoryItem).filter((x): x is CategoryOption => x !== null),
    )

    if (fromApi.length > 0) {
      return { options: fromApi.sort((a, b) => a.name.localeCompare(b.name)), source: 'categories' }
    }

    const { products } = await this.getProducts({ limit: 500, page: 1 })
    const ids = new Set<string>()
    for (const p of products) {
      const row = p as { category_id?: string; categoryId?: string }
      const cid = row.category_id ?? row.categoryId
      if (cid) ids.add(cid)
    }
    const fallback = [...ids]
      .sort()
      .map(id => ({ id, name: formatCategoryIdLabel(id) }))
    return { options: fallback, source: 'products_fallback' }
  },

  // Search products
  async searchProducts(query: string): Promise<Product[]> {
    return apiService.get<Product[]>(`/products/search?q=${encodeURIComponent(query)}`)
  },

  /** Create catalog product (product_manager or sales_manager). */
  async createProduct(
    token: string,
    body: ProductCreatePayload,
  ): Promise<{ id: string; name: string }> {
    const payload = { ...body }
    if (!payload.image_url) delete (payload as { image_url?: string }).image_url

    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(formatApiDetail((err as { detail?: unknown }).detail) || `HTTP ${res.status}`)
    }
    const data = (await res.json()) as { id: string; name: string }
    invalidateProductsCache()
    return data
  },
}