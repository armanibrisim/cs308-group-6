'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '../../context/AuthContext'

export default function SalesManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else if (user.role !== 'sales_manager') {
      router.replace('/browse')
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.role !== 'sales_manager') return null

  return <>{children}</>
}
