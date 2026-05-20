'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { SideNav } from '../../../components/layout/SideNav'
import { useAuth } from '../../../context/AuthContext'
import { Notification, notificationService } from '../../../services/notificationService'
import { LocalNotification, localNotificationService } from '../../../services/localNotificationService'

// Unified type shown in the list
interface UnifiedNotification {
  id: string
  message: string
  product_name?: string
  read: boolean
  created_at: string
  source: 'server' | 'local'
  localType?: LocalNotification['type']
  return_deadline?: string
}

const TYPE_ICON: Record<string, string> = {
  purchase:         'timer',
  return_submitted: 'assignment_return',
  return_approved:  'check_circle',
  return_rejected:  'cancel',
}
const TYPE_COLOR: Record<string, string> = {
  purchase:         'var(--c-neon)',
  return_submitted: '#f59e0b',
  return_approved:  '#22c55e',
  return_rejected:  '#ef4444',
}

function ReturnTimer({ deadline }: { deadline: string }) {
  const [daysLeft, setDaysLeft] = useState(0)
  useEffect(() => {
    const update = () => {
      const ms = new Date(deadline).getTime() - Date.now()
      setDaysLeft(Math.max(0, Math.ceil(ms / 864e5)))
    }
    update()
    const t = setInterval(update, 60_000)
    return () => clearInterval(t)
  }, [deadline])

  const pct = Math.min(100, (daysLeft / 30) * 100)
  const color = daysLeft > 10 ? 'var(--c-neon)' : daysLeft > 5 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ marginTop: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
          Return window
        </span>
        <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color }}>
          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
        </span>
      </div>
      <div style={{ height: '3px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [serverNotifs, setServerNotifs] = useState<Notification[]>([])
  const [localNotifs, setLocalNotifs] = useState<LocalNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
  }, [isLoading, user, router])

  const load = useCallback(async () => {
    if (!user?.token || !user?.doc_id) return
    setLoading(true)
    try {
      const data = await notificationService.getNotifications(user.token)
      setServerNotifs(data)
      setLocalNotifs(localNotificationService.getAll(user.doc_id))
    } catch {
      // ignore server errors
      setLocalNotifs(localNotificationService.getAll(user.doc_id))
    } finally {
      setLoading(false)
    }
  }, [user?.token, user?.doc_id])

  useEffect(() => {
    if (!isLoading && user) load()
  }, [isLoading, user, load])

  // Merge and sort
  const unified: UnifiedNotification[] = [
    ...serverNotifs.map(n => ({
      id: n.id,
      message: n.message,
      product_name: n.product_name,
      read: n.read,
      created_at: n.created_at,
      source: 'server' as const,
    })),
    ...localNotifs.map(n => ({
      id: n.id,
      message: n.message,
      product_name: n.product_name,
      read: n.read,
      created_at: n.created_at,
      source: 'local' as const,
      localType: n.type,
      return_deadline: n.return_deadline,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unreadCount = unified.filter(n => !n.read).length

  async function handleMarkRead(n: UnifiedNotification) {
    if (n.read) return
    if (n.source === 'server' && user?.token) {
      await notificationService.markRead(user.token, n.id).catch(() => {})
      setServerNotifs(prev => prev.map(s => s.id === n.id ? { ...s, read: true } : s))
    } else if (n.source === 'local' && user?.doc_id) {
      localNotificationService.markRead(user.doc_id, n.id)
      setLocalNotifs(localNotificationService.getAll(user.doc_id))
    }
  }

  async function handleMarkAllRead() {
    if (!user?.token || !user?.doc_id) return
    setMarkingAll(true)
    await notificationService.markAllRead(user.token).catch(() => {})
    localNotificationService.markAllRead(user.doc_id)
    setServerNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setLocalNotifs(localNotificationService.getAll(user.doc_id))
    setMarkingAll(false)
  }

  if (isLoading || !user) return null

  return (
    <>
      <SideNav />
      <main style={{ minHeight: '100vh', padding: '2.5rem 2rem 2rem 6rem' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(var(--c-neon-rgb),0.7)', marginBottom: '0.5rem' }}>
              Account
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Notifications</h1>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '999px',
                    padding: '0.4rem 1rem',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                  }}
                >
                  {markingAll ? 'Marking…' : `Mark all read (${unreadCount})`}
                </button>
              )}
            </div>
          </div>

          {/* List */}
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading…</p>
          ) : unified.length === 0 ? (
            <div style={{
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: '1.5rem',
              padding: '3rem',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px',
            }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {unified.map(n => {
                const icon  = n.source === 'local' && n.localType ? TYPE_ICON[n.localType]  : 'notifications'
                const color = n.source === 'local' && n.localType ? TYPE_COLOR[n.localType] : 'var(--c-neon)'
                return (
                  <div
                    key={n.id}
                    style={{
                      background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(var(--c-neon-rgb),0.05)',
                      border: `1px solid ${n.read ? 'rgba(255,255,255,0.08)' : 'rgba(var(--c-neon-rgb),0.20)'}`,
                      borderRadius: '1.25rem',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* Icon */}
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', color, opacity: n.read ? 0.4 : 0.9, flexShrink: 0, marginTop: '1px' }}
                    >
                      {icon}
                    </span>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '13px',
                        color: n.read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.9)',
                        lineHeight: 1.5,
                        marginBottom: '0.3rem',
                      }}>
                        {n.message}
                      </p>
                      {n.product_name && (
                        <p style={{ fontSize: '11px', color: 'rgba(var(--c-neon-rgb),0.65)', fontWeight: 600 }}>
                          {n.product_name}
                        </p>
                      )}
                      {/* 30-day return timer bar */}
                      {n.source === 'local' && n.localType === 'purchase' && n.return_deadline && (
                        <ReturnTimer deadline={n.return_deadline} />
                      )}
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '0.4rem' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Mark read button */}
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n)}
                        style={{
                          flexShrink: 0,
                          background: 'none',
                          border: '1px solid rgba(var(--c-neon-rgb),0.4)',
                          borderRadius: '999px',
                          padding: '0.25rem 0.75rem',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--c-neon)',
                          cursor: 'pointer',
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
