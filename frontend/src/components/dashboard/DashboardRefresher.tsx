'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function DashboardRefresher() {
  const router = useRouter()
  useEffect(() => { router.refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
