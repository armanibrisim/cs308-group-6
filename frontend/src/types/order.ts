export interface Order {
  id: string
  customerId: string
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  shippingAddress: string
  billingAddress: string
  paymentMethod: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'

export interface DeliveryList {
  deliveryId: string
  customerId: string
  productId: string
  quantity: number
  totalPrice: number
  deliveryAddress: string
  completionStatus: boolean
}