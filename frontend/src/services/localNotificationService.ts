/**
 * Local (localStorage-based) notification service.
 * Used for purchase, return-submitted, return-approved, return-rejected events
 * without requiring backend changes.
 */

export type LocalNotificationType =
  | 'purchase'
  | 'return_submitted'
  | 'return_approved'
  | 'return_rejected'

export interface LocalNotification {
  id: string
  type: LocalNotificationType
  message: string
  product_id: string
  product_name: string
  read: boolean
  created_at: string
  return_deadline?: string // ISO string — only for 'purchase' type
}

const storageKey = (userId: string) => `lumen_notifications_${userId}`
const statusKey  = (userId: string) => `lumen_return_statuses_${userId}`

function readAll(userId: string): LocalNotification[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) || '[]')
  } catch {
    return []
  }
}

function writeAll(userId: string, notifications: LocalNotification[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(userId), JSON.stringify(notifications))
}

export const localNotificationService = {
  getAll(userId: string): LocalNotification[] {
    return readAll(userId)
  },

  add(
    userId: string,
    data: Omit<LocalNotification, 'id' | 'read' | 'created_at'>
  ): LocalNotification {
    const existing = readAll(userId)
    const n: LocalNotification = {
      ...data,
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      read: false,
      created_at: new Date().toISOString(),
    }
    writeAll(userId, [n, ...existing])
    return n
  },

  markRead(userId: string, id: string): void {
    writeAll(userId, readAll(userId).map(n => n.id === id ? { ...n, read: true } : n))
  },

  markAllRead(userId: string): void {
    writeAll(userId, readAll(userId).map(n => ({ ...n, read: true })))
  },

  getUnreadCount(userId: string): number {
    return readAll(userId).filter(n => !n.read).length
  },

  /**
   * Called when orders page loads return requests.
   * Compares current statuses with previously saved ones and creates
   * local notifications for any pending→approved or pending→rejected transitions.
   */
  checkReturnStatusChanges(
    userId: string,
    requests: { id: string; status: string; product_name: string; product_id: string }[]
  ): void {
    if (typeof window === 'undefined') return
    try {
      const stored: Record<string, string> = JSON.parse(
        localStorage.getItem(statusKey(userId)) || '{}'
      )
      const updated: Record<string, string> = {}

      for (const req of requests) {
        const prev = stored[req.id]
        updated[req.id] = req.status

        if (prev === 'pending' && req.status === 'approved') {
          this.add(userId, {
            type: 'return_approved',
            message: `Your return request for "${req.product_name}" has been approved. Your refund will be processed shortly.`,
            product_id: req.product_id,
            product_name: req.product_name,
          })
        } else if (prev === 'pending' && req.status === 'rejected') {
          this.add(userId, {
            type: 'return_rejected',
            message: `Your return request for "${req.product_name}" has been rejected by the sales team.`,
            product_id: req.product_id,
            product_name: req.product_name,
          })
        }
      }

      localStorage.setItem(statusKey(userId), JSON.stringify(updated))
    } catch {
      // ignore
    }
  },
}
