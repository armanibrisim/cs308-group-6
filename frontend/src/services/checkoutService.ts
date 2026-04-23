const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('lumen_user')
  if (!raw) return null
  try {
    return (JSON.parse(raw) as { token?: string }).token ?? null
  } catch {
    return null
  }
}

export interface CheckoutItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface CheckoutOrder {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  delivery_address: string
  items: CheckoutItem[]
  subtotal: number
  discount_amount?: number
  promo_code?: string
  tax: number
  shipping: number
  total_amount: number
  status: string
  invoice_id: string | null
  created_at: string
  updated_at: string
}

export interface CheckoutInvoice {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  customer_tax_id?: string
  delivery_address: string
  items: CheckoutItem[]
  subtotal: number
  discount_amount?: number
  promo_code?: string
  tax: number
  shipping: number
  total_amount: number
  created_at: string
}

export interface CheckoutResult {
  order: CheckoutOrder
  invoice: CheckoutInvoice
}

export interface CheckoutPayload {
  delivery_address: string
  card_last4: string
  card_holder_name: string
  promo_code?: string
}

export interface PromoCode {
  id: string
  code: string
  discount_percent: number
  max_uses?: number
  uses: number
  expires_at?: string
  is_active: boolean
  created_at: string
}

async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error((error as { detail?: string }).detail ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const checkoutService = {
  placeOrder(payload: CheckoutPayload): Promise<CheckoutResult> {
    return request<CheckoutResult>('/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export const promoCodeService = {
  validate(code: string): Promise<{ code: string; discount_percent: number; message: string }> {
    return request('/promo-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },

  list(token: string): Promise<PromoCode[]> {
    return fetch(`${API_BASE_URL}/promo-codes`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }).then(async res => {
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: 'Error' })); throw new Error(e.detail) }
      return res.json()
    })
  },

  create(token: string, data: {
    code: string
    discount_percent: number
    max_uses?: number
    expires_at?: string
    is_active: boolean
  }): Promise<PromoCode> {
    return fetch(`${API_BASE_URL}/promo-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: 'Error' })); throw new Error(e.detail) }
      return res.json()
    })
  },

  update(token: string, id: string, data: Partial<{ discount_percent: number; max_uses: number; expires_at: string; is_active: boolean }>): Promise<PromoCode> {
    return fetch(`${API_BASE_URL}/promo-codes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: 'Error' })); throw new Error(e.detail) }
      return res.json()
    })
  },

  deactivate(token: string, id: string): Promise<PromoCode> {
    return fetch(`${API_BASE_URL}/promo-codes/${id}/deactivate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }).then(async res => {
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: 'Error' })); throw new Error(e.detail) }
      return res.json()
    })
  },

  delete(token: string, id: string): Promise<void> {
    return fetch(`${API_BASE_URL}/promo-codes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).then(async res => {
      if (!res.ok && res.status !== 204) { const e = await res.json().catch(() => ({ detail: 'Error' })); throw new Error(e.detail) }
    })
  },
}
