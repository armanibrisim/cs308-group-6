export const APP_CONFIG = {
  // App metadata
  APP_NAME: 'LUMEN',
  APP_DESCRIPTION: 'Your one-stop shop for consumer electronics and technology products',
  
  // Product categories
  PRODUCT_CATEGORIES: [
    'Smartphones & Tablets',
    'Laptops & Computers',
    'Headphones & Earbuds',
    'Smart Watches & Wearables',
    'Cameras & Photography',
    'Gaming & Peripherals',
    'Accessories & Cables',
  ] as const,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Rating system
  MIN_RATING: 1,
  MAX_RATING: 5, // Can be changed to 10 if needed
  
  // Order statuses
  ORDER_STATUSES: [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
  ] as const,
  
  // User roles
  USER_ROLES: [
    'customer',
    'sales_manager',
    'product_manager',
  ] as const,
} as const