'use client'

import { useProtectedRoute } from '@/lib/hooks'

export default function PengeluaranLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hanya superadmin dan admin yang boleh akses /pengeluaran
  useProtectedRoute(['superadmin', 'admin'])

  return <>{children}</>
}
