export interface CartItem {
  product_id: string
  quantity: number
  name: string
  price: number
  image_url: string | null
  description: string
  stock_quantity: number
}

export interface Cart {
  user_id: string
  items: CartItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
}

export interface CartItemAddRequest {
  product_id: string
  quantity: number
}

export interface CartItemUpdateRequest {
  quantity: number
}
