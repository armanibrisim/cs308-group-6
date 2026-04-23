import { apiService } from './api'

export interface Notification {
  id: string
  user_id: string
  message: string
  product_id: string
  product_name: string
  read: boolean
  created_at: string
}

export const notificationService = {
  getNotifications(token: string): Promise<Notification[]> {
    return apiService.get<Notification[]>('/auth/me/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  markRead(token: string, notificationId: string): Promise<void> {
    return apiService.patch<void>(`/auth/me/notifications/${notificationId}/read`, undefined, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  markAllRead(token: string): Promise<void> {
    return apiService.patch<void>('/auth/me/notifications/read-all', undefined, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}