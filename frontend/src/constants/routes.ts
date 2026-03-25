export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Customer routes
  BROWSE: '/browse',
  CART: '/cart',
  ORDERS: '/orders',
  PRODUCT_DETAIL: (id: string) => `/product/${id}`,
  
  // Sales Manager routes
  SALES_DASHBOARD: '/sales-dashboard',
  SALES_ORDERS: '/sales-manager/orders',
  SALES_INVOICES: '/sales-manager/invoices',
  SALES_DISCOUNTS: '/sales-manager/discounts',
  
  // Product Manager routes
  PRODUCT_DASHBOARD: '/products-dashboard',
  PRODUCT_MANAGEMENT: '/products-dashboard/products',
  CATEGORY_MANAGEMENT: '/products-dashboard/categories',
  STOCK_MANAGEMENT: '/products-dashboard/stock',
  DELIVERY_MANAGEMENT: '/products-dashboard/deliveries',
  REVIEW_MANAGEMENT: '/products-dashboard/reviews',
} as const