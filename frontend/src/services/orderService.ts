import { apiService } from './api'

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
  invoice_id: string | null
  created_at: string
  updated_at: string
}

export const orderService = {
  async getMyOrders(token: string): Promise<Order[]> {
    return apiService.get<Order[]>('/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getOrder(orderId: string, token: string): Promise<Order> {
    return apiService.get<Order>(`/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
