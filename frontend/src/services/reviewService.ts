import { apiService } from './api'

export interface Review {
  id: string
  product_id: string
  product_name?: string
  user_id: string
  username: string
  rating: number
  comment: string
  status: string
  created_at: string
}

export const reviewService = {
  async getApprovedReviews(productId: string): Promise<Review[]> {
    return apiService.get<Review[]>(`/reviews/product/${productId}`)
  },

  async submitReview(
    productId: string,
    rating: number,
    comment: string,
    token: string
  ): Promise<Review> {
    return apiService.post<Review>(
      '/reviews',
      { product_id: productId, rating, comment },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  },

  async voteReview(
    reviewId: string,
    voteType: 'like' | 'dislike',
    token: string
  ): Promise<{ likes: number; dislikes: number; user_vote: string | null }> {
    return apiService.post(
      `/reviews/${reviewId}/vote`,
      { vote_type: voteType },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  },

  async getMyReview(productId: string, token: string): Promise<Review | null> {
    try {
      return await apiService.get<Review>(
        `/reviews/my-review/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch {
      return null
    }
  },

  async getMyVotes(productId: string, token: string): Promise<Record<string, string>> {
    return apiService.get(
      `/reviews/votes/my-votes?product_id=${productId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
  },

  async getAllReviews(token: string): Promise<Review[]> {
    return apiService.get<Review[]>('/reviews/all', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async updateReviewStatus(
    reviewId: string,
    status: 'approved' | 'rejected',
    token: string
  ): Promise<Review> {
    return apiService.put<Review>(
      `/reviews/${reviewId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  },
}
