'use client'

import { useProtectedRoute } from '@/lib/hooks'

export default function LaporanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hanya superadmin dan admin yang boleh akses /laporan
  useProtectedRoute(['superadmin', 'admin'])

  return <>{children}</>
}
