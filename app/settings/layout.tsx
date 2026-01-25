'use client'

import { useProtectedRoute } from '@/lib/hooks'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Superadmin dan admin bisa akses /settings
  useProtectedRoute(['superadmin', 'admin'])

  return <>{children}</>
}
