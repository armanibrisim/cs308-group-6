export interface User {
  id: string
  name: string
  email: string
  taxId: string
  homeAddress: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'customer' | 'sales_manager' | 'product_manager'

export interface Customer extends User {
  role: 'customer'
  wishlist: string[] // Product IDs
  orderHistory: string[] // Order IDs
}

export interface SalesManager extends User {
  role: 'sales_manager'
  permissions: string[]
}

export interface ProductManager extends User {
  role: 'product_manager'
  permissions: string[]
}