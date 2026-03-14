export interface Product {
  id: string
  name: string
  model: string
  serialNumber: string
  description: string
  stockQuantity: number
  price: number
  warranty: string
  distributor: string
  categoryId: string
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
  parentCategoryId?: string
  createdAt: Date
  updatedAt: Date
}

export interface ProductReview {
  id: string
  productId: string
  customerId: string
  rating: number // 1-5 stars or 1-10 points
  comment: string
  approved: boolean
  createdAt: Date
  updatedAt: Date
}