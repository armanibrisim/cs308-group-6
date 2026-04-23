'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { SideNav } from '../../../components/layout/SideNav'
import { useAuth } from '../../../context/AuthContext'
import { Notification, notificationService } from '../../../services/notificationService'

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/login')
  }, [isLoading, user, router])

  const load = useCallback(async () => {
    if (!user?.token) return
    setLoading(true)
    try {
      const data = await notificationService.getNotifications(user.token)
      setNotifications(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    if (!isLoading && user) load()
  }, [isLoading, user, load])

  async function handleMarkRead(id: string) {
    if (!user?.token) return
    await notificationService.markRead(user.token, id).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function handleMarkAllRead() {
    if (!user?.token) return
    setMarkingAll(true)
    await notificationService.markAllRead(user.token).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setMarkingAll(false)
  }

  if (isLoading || !user) return null

  const unreadCount = notifications.filter(n => !n.read).length

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
                  transition: 'all 0.2s',
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
        ) : notifications.length === 0 ? (
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
            {notifications.map(n => (
              <div
                key={n.id}
                style={{
                  background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(var(--c-neon-rgb),0.06)',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.08)' : 'rgba(var(--c-neon-rgb),0.25)'}`,
                  borderRadius: '1.25rem',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '13px',
                    color: n.read ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)',
                    lineHeight: 1.5,
                    marginBottom: '0.35rem',
                  }}>
                    {n.message}
                  </p>
                  {n.product_name && (
                    <p style={{ fontSize: '11px', color: 'rgba(var(--c-neon-rgb),0.7)', fontWeight: 600 }}>
                      {n.product_name}
                    </p>
                  )}
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '0.35rem' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
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
            ))}
          </div>
        )}

      </div>
    </main>
    </>
  )
}