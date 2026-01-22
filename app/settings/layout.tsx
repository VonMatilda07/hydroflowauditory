'use client'

import { useProtectedRoute } from '@/lib/hooks'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hanya superadmin yang boleh akses /settings
  useProtectedRoute('superadmin')

  return <>{children}</>
}
