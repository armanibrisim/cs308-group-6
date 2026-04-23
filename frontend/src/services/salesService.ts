const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...authHeaders(token), ...(options.headers ?? {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface DiscountApplyPayload {
  product_ids: string[]
  discount_percent: number
}

export interface DiscountProduct {
  id: string
  name: string
  price: number
  original_price?: number
  discount_percent?: number
  image_url?: string
  category_id: string
}

export interface DiscountApplyResponse {
  updated_count: number
  notified_users: number
  updated_products: DiscountProduct[]
}

export interface InvoiceItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Invoice {
  id: string
  customer_id: string
  customer_email: string
  customer_name: string
  delivery_address: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  shipping: number
  total_amount: number
  created_at: string
}

export interface ChartDataPoint {
  date: string
  revenue: number
  profit: number
}

export interface AnalyticsResponse {
  total_revenue: number
  total_cost: number
  total_profit: number
  invoice_count: number
  chart_data: ChartDataPoint[]
}

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Order {
  id: string
  customer_id: string
  customer_email: string
  customer_name: string
  delivery_address: string
  items: OrderItem[]
  subtotal: number
  tax: number
  shipping: number
  total_amount: number
  status: 'processing' | 'in-transit' | 'delivered'
  invoice_id?: string
  created_at: string
  updated_at: string
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const salesService = {
  applyDiscount(token: string, payload: DiscountApplyPayload): Promise<DiscountApplyResponse> {
    return request('/sales/discounts', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  removeDiscount(token: string, productId: string): Promise<DiscountProduct> {
    return request(`/sales/discounts/${productId}`, token, { method: 'DELETE' })
  },

  getInvoices(token: string, startDate?: string, endDate?: string): Promise<Invoice[]> {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request(`/sales/invoices${qs}`, token)
  },

  getAnalytics(token: string, startDate?: string, endDate?: string): Promise<AnalyticsResponse> {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request(`/sales/analytics${qs}`, token)
  },

  getOrders(token: string, status?: string): Promise<Order[]> {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request(`/orders/all${qs}`, token)
  },

  updateOrderStatus(token: string, orderId: string, newStatus: Order['status']): Promise<Order> {
    return request(`/orders/${orderId}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })
  },

  async downloadInvoicePdf(token: string, invoiceId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.blob()
  },

  getProducts(token: string, page = 1, limit = 100): Promise<{ products: DiscountProduct[]; total: number }> {
    return request(`/products?page=${page}&limit=${limit}`, token)
  },
}
