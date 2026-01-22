'use client'

import { useProtectedRoute } from '@/lib/hooks'

export default function DebtTrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hanya superadmin dan admin yang boleh akses
  useProtectedRoute(['superadmin', 'admin'])

  return <>{children}</>
}
