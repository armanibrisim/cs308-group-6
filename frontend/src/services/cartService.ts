import { Cart, CartItemAddRequest, CartItemUpdateRequest } from '../types/cart'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('lumen_user')
  if (!raw) return null
  try {
    const user = JSON.parse(raw)
    return user.token ?? null
  } catch {
    return null
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail ?? `HTTP ${response.status}`)
  }

  return response.json()
}

export const cartService = {
  getCart(): Promise<Cart> {
    return request<Cart>('/cart')
  },

  addItem(payload: CartItemAddRequest): Promise<Cart> {
    return request<Cart>('/cart/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateItem(productId: string, payload: CartItemUpdateRequest): Promise<Cart> {
    return request<Cart>(`/cart/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  removeItem(productId: string): Promise<Cart> {
    return request<Cart>(`/cart/items/${productId}`, { method: 'DELETE' })
  },

  clearCart(): Promise<{ success: boolean; message: string }> {
    return request('/cart', { method: 'DELETE' })
  },
}
