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
        // User sudah dijamin login oleh middleware
        // Tapi kita tetap cek role untuk route protection
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.warn('[useProtectedRoute] No user found, redirecting to login')
          router.push('/login')
          return
        }

        // Ambil role dari database
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
          console.warn('[useProtectedRoute] No profile found')
          router.push('/login')
          return
        }

        // Cek apakah role user termasuk yang diizinkan
        const rolesArray = Array.isArray(allowedRoles) 
          ? allowedRoles 
          : [allowedRoles]

        if (!rolesArray.includes(profile.role)) {
          console.warn('[useProtectedRoute] User role not allowed:', profile.role)
          router.push('/')
          return
        }

        console.log('[useProtectedRoute] ✅ Access granted:', profile.role)
      } catch (error) {
        console.error('[useProtectedRoute] Error:', error)
        router.push('/')
      }
    }

    checkAccess()
  }, [router, allowedRoles])
}
