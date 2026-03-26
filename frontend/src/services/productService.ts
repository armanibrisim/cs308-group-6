import { apiService } from './api'
import { Product, ProductCategory } from '../types/product'

export const productService = {
  // Get all products with optional filters
  async getProducts(params?: {
    category_id?: string
    category?: string
    search?: string
    sortBy?: 'price' | 'popularity' | 'name'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }): Promise<{ products: Product[]; total: number }> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }

    return apiService.get<{ products: Product[]; total: number }>(
      `/products?${queryParams.toString()}`
    )
  },

  // Get a single product by ID
  async getProduct(id: string): Promise<Product> {
    return apiService.get<Product>(`/products/${id}`)
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