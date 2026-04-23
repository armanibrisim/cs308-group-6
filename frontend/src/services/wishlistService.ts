import { apiService } from './api'

export const wishlistService = {
  async getWishlist(token: string): Promise<{ product_ids: string[] }> {
    return apiService.get('/wishlist', { headers: { Authorization: `Bearer ${token}` } })
  },

  async addToWishlist(productId: string, token: string): Promise<{ product_ids: string[] }> {
    return apiService.post(`/wishlist/${productId}`, undefined, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async removeFromWishlist(productId: string, token: string): Promise<{ product_ids: string[] }> {
    return apiService.delete(`/wishlist/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getWishlistProducts(token: string): Promise<any[]> {
    return apiService.get('/wishlist/products', { headers: { Authorization: `Bearer ${token}` } })
  },
}
