'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Hook untuk proteksi route berdasarkan role
 * Redirect ke home kalau role tidak sesuai atau user tidak login
 * 
 * Contoh penggunaan:
 * useProtectedRoute('superadmin')
 * useProtectedRoute(['superadmin', 'admin'])
 */
export function useProtectedRoute(allowedRoles: string | string[]) {
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // 1. Cek apakah user sudah login dengan proper error handling
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('[useProtectedRoute] Auth error:', authError.message)
          router.push('/login')
          return
        }

        if (!user) {
          console.warn('[useProtectedRoute] No authenticated user found')
          router.push('/login')
          return
        }

        console.log('[useProtectedRoute] ✅ User authenticated:', user.id)

        // 2. Ambil role dari database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('[useProtectedRoute] Profile fetch error:', profileError.message)
          router.push('/login')
          return
        }

        if (!profile) {
          console.warn('[useProtectedRoute] No profile found for user')
          router.push('/login')
          return
        }

        // 3. Cek apakah role user termasuk yang diizinkan
        const rolesArray = Array.isArray(allowedRoles) 
          ? allowedRoles 
          : [allowedRoles]

        if (!rolesArray.includes(profile.role)) {
          console.warn('[useProtectedRoute] User role not allowed:', profile.role, 'Allowed:', rolesArray)
          router.push('/')
          return
        }

        console.log('[useProtectedRoute] ✅ Access granted for role:', profile.role)
        // Akses diizinkan, biarkan halaman render
      } catch (error) {
        console.error('[useProtectedRoute] Unexpected error:', error)
        router.push('/')
      }
    }

    checkAccess()
  }, [router, allowedRoles])
}
