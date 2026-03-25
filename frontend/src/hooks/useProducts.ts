import { useState, useEffect } from 'react'
import { Product } from '../types/product'
import { productService } from '../services/productService'

interface UseProductsParams {
  category?: string
  search?: string
  sortBy?: 'price' | 'popularity' | 'name'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export const useProducts = (params?: UseProductsParams) => {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await productService.getProducts(params)
        setProducts(response.products)
        setTotal(response.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [params?.category, params?.search, params?.sortBy, params?.sortOrder, params?.page, params?.limit])

  return {
    products,
    total,
    loading,
    error,
    refetch: () => {
      const fetchProducts = async () => {
        try {
          setLoading(true)
          setError(null)
          const response = await productService.getProducts(params)
          setProducts(response.products)
          setTotal(response.total)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch products')
        } finally {
          setLoading(false)
        }
      }
      fetchProducts()
    }
  }
}