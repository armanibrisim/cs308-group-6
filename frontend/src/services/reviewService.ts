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
  likes: number
  dislikes: number
}

export interface CanReviewStatus {
  can_review: boolean
  has_delivered_order: boolean
  already_reviewed: boolean
}

export const reviewService = {
  async getApprovedReviews(productId: string): Promise<Review[]> {
    return apiService.get<Review[]>(`/reviews/product/${productId}`)
  },

  async submitReview(
    productId: string,
    rating: number,
    comment: string = '',
    token: string
  ): Promise<Review> {
    return apiService.post<Review>(
      '/reviews',
      { product_id: productId, rating, comment },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  },

  async deleteReview(reviewId: string, token: string): Promise<void> {
    await apiService.delete(`/reviews/${reviewId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async updateReview(
    reviewId: string,
    rating: number,
    comment: string = '',
    token: string
  ): Promise<Review> {
    return apiService.put<Review>(
      `/reviews/${reviewId}`,
      { rating, comment },
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

  async canReview(productId: string, token: string): Promise<CanReviewStatus> {
    try {
      return await apiService.get<CanReviewStatus>(
        `/reviews/can-review/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch {
      return { can_review: false, has_delivered_order: false, already_reviewed: false }
    }
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

  async getAllReviews(token: string, status?: 'pending' | 'approved' | 'rejected'): Promise<Review[]> {
    const url = status ? `/reviews/all?status=${status}` : '/reviews/all'
    return apiService.get<Review[]>(url, {
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
